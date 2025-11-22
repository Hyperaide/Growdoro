"use client";
import {
  XIcon,
  TimerIcon,
  PlayIcon,
  PauseIcon,
  CheckIcon,
  PackageIcon,
  PlantIcon,
  FlowerLotusIcon,
  ListChecksIcon,
  ArrowsOutSimpleIcon,
  ArrowsInSimpleIcon,
  BellIcon,
  SealCheckIcon,
  SparkleIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { useRef, useState, useEffect, useMemo, useCallback, memo } from "react";
import { db } from "../../lib/db";
import { id } from "@instantdb/react";
import {
  BLOCK_TYPES,
  BlockTypeId,
  getBlockDisplayImage,
} from "../constants/blocks";
import PackOpeningModal from "./PackOpeningModal";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { useAuth } from "../contexts/auth-context";
import AuthButton from "./AuthButton";
import { DateTime } from "luxon";
import { UPDATES } from "../constants/updates";
import AboutTab from "./AboutTab";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../contexts/theme-context";
import posthog from "posthog-js";
import {
  trackTimerStarted,
  trackTimerCompleted,
  trackTimerStopped,
  trackPackOpened,
  trackPackClaimed,
} from "@/lib/events";

interface MainSlideoverProps {
  isOpen: boolean;
  onClose?: () => void;
  selectedBlockType?: string | null;
  onSelectBlockType?: (type: string | null) => void;
}

interface Session {
  id: string;
  sessionId?: string;
  createdAt: number;
  timeInSeconds: number;
  paused?: boolean;
  completedAt?: string | number;
  rewardsClaimedAt?: string | number;
  timeRemaining?: number;
  type?: "focus" | "break";
}

interface Block {
  id: string;
  x?: number;
  y?: number;
  z?: number;
  type: string;
  sessionId?: string;
}

// Get or create a browser session ID
const getBrowserSessionId = (): string => {
  const STORAGE_KEY = "gardenspace_session_id";
  let sessionId = localStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    sessionId = id();
    localStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
};

// Memoized timer display component
const TimerDisplay = memo(({ remainingTime }: { remainingTime: number }) => {
  const mins = Math.floor(remainingTime / 60);
  const secs = Math.floor(remainingTime % 60);

  return (
    <div className="text-4xl font-barlow font-bold text-neutral-800 dark:text-neutral-200">
      <NumberFlowGroup>
        <div
          style={
            {
              fontVariantNumeric: "tabular-nums",
              "--number-flow-char-height": "0.85em",
            } as React.CSSProperties
          }
        >
          <NumberFlow
            trend={-1}
            value={mins}
            format={{ minimumIntegerDigits: 2 }}
          />
          <NumberFlow
            prefix=":"
            trend={-1}
            value={secs}
            digits={{ 1: { max: 5 } }}
            format={{ minimumIntegerDigits: 2 }}
          />
        </div>
      </NumberFlowGroup>
    </div>
  );
});

TimerDisplay.displayName = "TimerDisplay";

// Supporter Tab Component
const SupporterTab = memo(({ profile }: { profile: any }) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelSubscription = async () => {
    if (!profile?.stripeDetails?.subscriptionId) return;

    setIsCancelling(true);
    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: profile.stripeDetails.subscriptionId,
          profileId: profile.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Show success message and close confirmation
        setShowCancelConfirm(false);
        // The UI will update automatically via the webhook
      } else {
        console.error("Failed to cancel subscription:", result.error);
        alert("Failed to cancel subscription. Please try again.");
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      alert("Failed to cancel subscription. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!profile?.stripeDetails?.subscriptionId) return;

    setIsReactivating(true);
    try {
      const response = await fetch("/api/stripe/reactivate-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: profile.stripeDetails.subscriptionId,
          profileId: profile.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // The UI will update automatically via the webhook
      } else {
        console.error("Failed to reactivate subscription:", result.error);
        alert("Failed to reactivate subscription. Please try again.");
      }
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      alert("Failed to reactivate subscription. Please try again.");
    } finally {
      setIsReactivating(false);
    }
  };

  const stripeDetails = profile?.stripeDetails as any;
  const isSupporter = profile?.supporter;
  const supporterUntil = profile?.supporterUntil;
  const cancelAtPeriodEnd = stripeDetails?.cancelAtPeriodEnd;

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="space-y-4">
        <div className="rounded-lg gap-1 flex flex-col">
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 flex flex-row items-center gap-2 text-sm">
            <SparkleIcon size={16} weight="fill" className="text-green-600" />
            Free Forever
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 text-xs">
            Growdoro will always be free to use. Enjoy unlimited focus sessions
            and grow your infinite garden.
          </p>
        </div>

        {isSupporter ? (
          // Supporter Management UI
          <div className="space-y-4">
            <div className="bg-sky-50 dark:bg-sky-900 border border-sky-200 dark:border-sky-800 rounded-lg p-3">
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-2 text-sm">
                <SealCheckIcon
                  size={16}
                  weight="fill"
                  className="text-sky-600 dark:text-sky-200"
                />
                Supporter Status
              </h3>
              <div className="space-y-2">
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  <span className="font-medium">Status:</span> Active Supporter
                </div>
                {supporterUntil && (
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    <span className="font-medium">Renews:</span>{" "}
                    {DateTime.fromISO(supporterUntil).toLocaleString(
                      DateTime.DATE_MED
                    )}
                  </div>
                )}
                {cancelAtPeriodEnd && (
                  <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900 p-2 rounded border border-amber-200 dark:border-amber-800">
                    <span className="font-medium">
                      Subscription will be cancelled
                    </span>{" "}
                    at the end of the current billing period.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
              <h4 className="font-medium text-neutral-800 dark:text-neutral-200 text-xs mb-2">
                Supporter Benefits
              </h4>
              <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                <li>• Early access to new features</li>
                <li>• Exclusive plants and decorations</li>
                <li>• 4 exclusive decoration blocks per year</li>
                <li>• Supporter badge on your profile</li>
              </ul>
            </div>

            <div className="border-t pt-4 border-dashed border-neutral-200 dark:border-neutral-800">
              {cancelAtPeriodEnd ? (
                <button
                  onClick={handleReactivateSubscription}
                  disabled={isReactivating}
                  className="w-full text-xs flex flex-row items-center justify-center gap-2 font-medium text-center bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 px-4 py-3 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors border border-green-200 dark:border-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReactivating
                    ? "Reactivating..."
                    : "Reactivate Subscription"}
                </button>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full text-xs flex flex-row items-center justify-center gap-2 font-medium text-center bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors border border-red-200 dark:border-red-800"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        ) : (
          // Become a Supporter UI (existing)
          <div className="space-y-4">
            <div className="">
              <h3 className="font-semibold text-neutral-800 mb-2 flex items-center gap-2 text-sm">
                <SealCheckIcon
                  size={16}
                  weight="fill"
                  className="text-sky-600"
                />
                Become a Supporter
              </h3>
              <p className="text-neutral-600 text-xs mb-3">
                If you want to support Growdoro and unlock some exclusive stuff,
                you can become a supporter. It's{" "}
                <span className="font-semibold text-sky-600">$10 a year.</span>
              </p>
              <p className="text-neutral-600 text-xs mb-3">
                You get early access to new features, exclusive plants, 4
                exclusive decorations blocks a year and a little badge on your
                profile ☺️
              </p>
            </div>

            <div className="mt-4">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(
                    `${process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}?client_reference_id=${profile?.id}`,
                    "_blank"
                  );
                }}
                className="w-full text-xs flex flex-row items-center justify-center gap-2 font-medium text-center bg-sky-600 text-white px-4 py-3 rounded-lg hover:bg-sky-700 transition-colors"
              >
                <SealCheckIcon size={14} weight="fill" className="text-white" />
                Become a Supporter - $10/year
              </a>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <h3 className="font-semibold text-neutral-800 mb-3">
                Cancel Subscription?
              </h3>
              <p className="text-neutral-600 text-sm mb-4">
                Your subscription will be cancelled at the end of the current
                billing period. You'll keep your supporter benefits until then.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCancelling ? "Cancelling..." : "Cancel Subscription"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

SupporterTab.displayName = "SupporterTab";

// Tab type definition
type TabType =
  | "timer"
  | "sessions"
  | "blocks"
  | "packs"
  | "help"
  | "supporter"
  | "updates"
  | "about"
  | null;

// Tab Item Component
interface TabItemProps {
  id: string;
  label: string;
  activeTab: TabType;
  onClick: () => void;
  showIndicator?: boolean;
  fontFamily?: "barlow" | "mono";
}

const TabItem = memo(
  ({
    id,
    label,
    activeTab,
    onClick,
    showIndicator = false,
    fontFamily = "barlow",
  }: TabItemProps) => {
    const isActive = activeTab === id;
    const fontClass = fontFamily === "mono" ? "font-mono" : "font-barlow";
    const fontWeight = fontFamily === "mono" ? "font-medium" : "font-semibold";

    return (
      <button
        className={`flex flex-row items-center gap-1 px-2 py-1 rounded-md transition-colors ${
          isActive
            ? "bg-neutral-200 text-neutral-900 dark:text-neutral-100 dark:bg-neutral-800"
            : "bg-transparent hover:bg-neutral-100 text-neutral-600 dark:text-neutral-400 dark:hover:bg-neutral-800"
        }`}
        onClick={onClick}
      >
        <h1 className={`text-xs ${fontWeight} ${fontClass} uppercase`}>
          {label}
        </h1>
        {showIndicator && (
          <span className="bg-green-500 rounded-full h-2 w-2 ml-1"></span>
        )}
      </button>
    );
  }
);

TabItem.displayName = "TabItem";

// Tabs Component
interface TabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  sessions: any[];
  blockInventory: Record<string, number>;
  user: any;
  profile: any;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

const Tabs = memo(
  ({
    activeTab,
    setActiveTab,
    sessions,
    blockInventory,
    user,
    profile,
    isExpanded,
    setIsExpanded,
  }: TabsProps) => {
    const hasUnclaimedPacks =
      sessions.filter((s) => s.completedAt && !s.rewardsClaimedAt).length > 0;

    const hasBlocks = Object.keys(blockInventory).length > 0;

    const { theme, toggleTheme } = useTheme();

    return (
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-wrap items-center gap-1 w-full">
          <TabItem
            id="timer"
            label="Timer"
            activeTab={activeTab}
            onClick={() => {
              setActiveTab("timer");
              setIsExpanded(true);
            }}
          />
          <TabItem
            id="packs"
            label="Packs"
            activeTab={activeTab}
            onClick={() => {
              setActiveTab("packs");
              setIsExpanded(true);
            }}
            showIndicator={hasUnclaimedPacks}
          />
          <TabItem
            id="blocks"
            label="Blocks"
            activeTab={activeTab}
            onClick={() => {
              setActiveTab("blocks");
              setIsExpanded(true);
            }}
            showIndicator={hasBlocks}
          />
          <TabItem
            id="help"
            label="Help"
            activeTab={activeTab}
            onClick={() => {
              setActiveTab("help");
              setIsExpanded(true);
            }}
          />
          <TabItem
            id="updates"
            label="Updates"
            activeTab={activeTab}
            onClick={() => {
              setActiveTab("updates");
              setIsExpanded(true);
            }}
          />
          <TabItem
            id="about"
            label="About"
            activeTab={activeTab}
            onClick={() => {
              setActiveTab("about");
              setIsExpanded(true);
            }}
          />
          {user && (
            <TabItem
              id="supporter"
              label={profile?.supporter ? "Manage" : "Supporter"}
              activeTab={activeTab}
              onClick={() => {
                setActiveTab("supporter");
                setIsExpanded(true);
              }}
              fontFamily="mono"
            />
          )}

          <TabItem
            id="theme"
            label={theme === "light" ? "Night Mode" : "Day Mode"}
            activeTab={null}
            onClick={() => {
              toggleTheme();
            }}
          />
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-4 p-1 hover:bg-olive-3 rounded transition-colors"
          aria-label={isExpanded ? "Collapse view" : "Expand view"}
        >
          {isExpanded ? (
            <ArrowsInSimpleIcon
              size={14}
              weight="bold"
              className="text-gray-800"
            />
          ) : (
            <ArrowsOutSimpleIcon
              size={14}
              weight="bold"
              className="text-gray-800"
            />
          )}
        </button>
      </div>
    );
  }
);

Tabs.displayName = "Tabs";

const MainSlideover = memo(function MainSlideover({
  isOpen,
  onClose,
  selectedBlockType,
  onSelectBlockType,
}: MainSlideoverProps) {
  const mainSlideoverRef = useRef<HTMLDivElement>(null);
  const [timerMode, setTimerMode] = useState<"focus" | "break">("focus");
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [browserSessionId, setBrowserSessionId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    | "timer"
    | "sessions"
    | "blocks"
    | "packs"
    | "help"
    | "supporter"
    | "updates"
    | "about"
    | null
  >("timer");
  const [isExpanded, setIsExpanded] = useState(true);
  const [claimingReward, setClaimingReward] = useState(false);
  const [packOpeningRewards, setPackOpeningRewards] = useState<string[]>([]);
  const [showPackOpening, setShowPackOpening] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);

  const { user, profile, sessionId } = useAuth();
  const effectiveSessionId = user?.id || sessionId || browserSessionId;

  // Refs for timer optimization
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRemainingTimeRef = useRef<number>(0);
  const resumedAtRef = useRef<number | null>(null);
  const remainingTimeOnResumeRef = useRef<number | null>(null);

  // Get browser session ID on mount
  useEffect(() => {
    setBrowserSessionId(getBrowserSessionId());
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Adjust timer duration when mode changes
  useEffect(() => {
    if (timerMode === "break") {
      // Default to 5 minutes for breaks, clamp to max 15
      if (timerMinutes > 15) {
        setTimerMinutes(5);
      } else if (timerMinutes < 1) {
        setTimerMinutes(5);
      }
    } else {
      // Default to 25 minutes for focus, clamp to min 5 (max is 120, handled by input)
      if (timerMinutes < 5) {
        setTimerMinutes(25);
      } else if (timerMinutes > 120) {
        setTimerMinutes(25);
      }
    }
  }, [timerMode]);

  // Handle tab visibility changes - removed since we're using a simpler countdown approach

  // Query sessions and blocks for this browser session
  const { data, isLoading } = db.useQuery(
    effectiveSessionId
      ? {
          sessions: {
            $: {
              where: user
                ? {
                    "user.id": user.id,
                    cancelledAt: { $isNull: true },
                  }
                : {
                    sessionId: effectiveSessionId,
                    cancelledAt: { $isNull: true },
                  },
            },
          },
          blocks: {
            $: {
              where: user
                ? {
                    "user.id": user.id,
                    x: { $isNull: true },
                  }
                : {
                    sessionId: effectiveSessionId,
                    x: { $isNull: true },
                  },
            },
          },
        }
      : null
  );

  const sessions = data?.sessions || [];
  const unplacedBlocks = data?.blocks || [];

  // Memoize expensive calculations
  const sessionsWithUnclaimedRewards = useMemo(() => {
    return sessions.filter((session) => {
      const sessionDuration = session.timeInSeconds * 1000;
      const sessionStartedAt = session.createdAt;
      const now = DateTime.now().toMillis();
      const timeElapsed = now - sessionStartedAt;
      return (
        timeElapsed >= sessionDuration &&
        !session.timeRemaining &&
        session.type !== "break" &&
        !session.paused &&
        !session.rewardsClaimedAt
      );
    });
  }, [sessions]);

  // Group blocks by type - memoize this calculation
  const blockInventory = useMemo(() => {
    return unplacedBlocks.reduce((acc, block) => {
      if (!acc[block.type]) {
        acc[block.type] = 0;
      }
      acc[block.type]++;
      return acc;
    }, {} as Record<string, number>);
  }, [unplacedBlocks]);

  // Load the latest active timer on mount or when sessions change
  useEffect(() => {
    if (!sessions.length || activeSession) return;

    // Find the latest session that's not completed and not paused
    const latestActive = sessions
      .filter((s) => !s.completedAt)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (latestActive) {
      // If the session has a stored timeRemaining (was paused), use that
      // Otherwise calculate remaining time based on when it was created
      let remaining;

      if (
        latestActive.timeRemaining !== undefined &&
        latestActive.timeRemaining !== null
      ) {
        // Use the stored timeRemaining from when it was paused
        remaining = latestActive.timeRemaining;
      } else {
        // Calculate remaining time based on elapsed time
        const elapsed = Math.floor(
          (Date.now() - latestActive.createdAt) / 1000
        );
        remaining = Math.max(0, latestActive.timeInSeconds - elapsed);
      }

      if (remaining > 0) {
        setActiveSession(latestActive as Session);
        setRemainingTime(remaining);
        setIsPaused(latestActive.paused || false);
      } else {
        // Timer has expired while the page was closed, mark it as completed
        db.transact(
          db.tx.sessions[latestActive.id].update({
            completedAt: Date.now(),
          })
        );
      }
    }
  }, [sessions, activeSession]);

  // Optimized timer effect using refs
  useEffect(() => {
    if (!activeSession || activeSession.completedAt || isPaused) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    resumedAtRef.current = Date.now();
    remainingTimeOnResumeRef.current = remainingTime;

    const tick = () => {
      const remainingOnResume = remainingTimeOnResumeRef.current;
      const resumeTime = resumedAtRef.current;

      if (remainingOnResume !== null && resumeTime !== null) {
        const elapsedSeconds = (Date.now() - resumeTime) / 1000;
        const newTime = Math.round(remainingOnResume - elapsedSeconds);

        lastRemainingTimeRef.current = newTime;

        if (newTime <= 0) {
          setRemainingTime(0);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
        } else {
          setRemainingTime(newTime);
        }
      }
    };

    tick(); // Run once immediately
    timerIntervalRef.current = setInterval(tick, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [activeSession, isPaused]);

  // Update document title with timer - use ref to avoid recreating
  useEffect(() => {
    if (activeSession && !activeSession.completedAt && remainingTime > 0) {
      const mins = Math.floor(remainingTime / 60);
      const secs = remainingTime % 60;
      const timeString = `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
      document.title = `${timeString} - Growdoro`;
    } else {
      document.title = "Growdoro";
    }
  }, [activeSession, remainingTime]);

  // Handle timer completion
  useEffect(() => {
    if (activeSession && remainingTime === 0 && !activeSession.completedAt) {
      // Show browser notification first, before updating the database
      const showNotification = async () => {
        const isBreak = activeSession.type === "break";
        const title = isBreak ? "Break Over! ☀️" : "Timer Complete! 🌱";
        const body = isBreak
          ? "Time to get back to growing your garden!"
          : `Your ${Math.floor(
              activeSession.timeInSeconds / 60
            )} minute focus session is complete. Claim your seed pack!`;

        if ("Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification(title, {
              body,
              icon: "/plants/morning-glory.png", // Using an existing plant image as icon
              tag: "timer-complete",
              requireInteraction: false,
            });
          } else if (Notification.permission !== "denied") {
            // Request permission if not already denied
            try {
              const permission = await Notification.requestPermission();
              if (permission === "granted") {
                new Notification(title, {
                  body,
                  icon: "/plants/morning-glory.png",
                  tag: "timer-complete",
                  requireInteraction: false,
                });
              }
            } catch (error) {
              console.error("Error requesting notification permission:", error);
            }
          }
        }

        // Play a sound if possible
        try {
          const audio = new Audio(
            "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE"
          );
          audio.volume = 0.5;
          audio.play();
        } catch (error) {
          console.log("Could not play notification sound");
        }
      };

      // Show notification immediately
      showNotification();

      // Complete the session after a small delay to ensure notification shows
      setTimeout(() => {
        db.transact(
          db.tx.sessions[activeSession.id].update({
            completedAt: Date.now(),
          })
        );

        // Track timer completed
        const duration = activeSession.timeInSeconds;
        const actualTime = duration; // Timer completed fully
        trackTimerCompleted(duration, actualTime);
      }, 100);
    }
  }, [activeSession, remainingTime]);

  const startTimer = async (
    type?: "focus" | "break",
    durationMinutes?: number
  ) => {
    const timerType = type || timerMode;

    // Check if authenticated user has a profile (only for focus sessions)
    if (timerType === "focus" && user && !profile) {
      alert("Please complete your profile setup first!");
      return;
    }

    // Request notification permission when starting timer
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }

    const minutes = durationMinutes || timerMinutes;
    const newSessionId = id();
    const newSession = {
      sessionId: effectiveSessionId,
      createdAt: Date.now(),
      timeInSeconds: minutes * 60,
      paused: false,
      type: timerType as "focus" | "break",
    };

    // Create session with user link if authenticated
    if (user) {
      await db.transact(
        db.tx.sessions[newSessionId].update(newSession).link({
          user: user.id,
        })
      );
    } else {
      await db.transact(db.tx.sessions[newSessionId].update(newSession));
    }

    const createdSession = {
      ...newSession,
      id: newSessionId,
    } as Session;

    setActiveSession(createdSession);
    setRemainingTime(minutes * 60);
    setIsPaused(false);

    // Track timer started
    trackTimerStarted(minutes * 60);
  };

  const pauseTimer = () => {
    if (!activeSession) return;

    if (!isPaused) {
      // Pausing the timer
      setIsPaused(true);
      setPausedAt(Date.now());
      db.transact(
        db.tx.sessions[activeSession.id].update({
          paused: true,
          timeRemaining: Math.round(remainingTime), // Store as integer seconds
        })
      );
    } else {
      // Resuming the timer
      setIsPaused(false);
      setPausedAt(null);
      // Update the session to clear the paused state
      db.transact(
        db.tx.sessions[activeSession.id].update({
          paused: false,
          timeRemaining: null,
        })
      );
    }
  };

  const cancelTimer = () => {
    if (activeSession) {
      // Track timer stopped
      const duration = activeSession.timeInSeconds;
      const elapsedTime = duration - remainingTime;
      trackTimerStopped(duration, elapsedTime);

      db.transact(
        db.tx.sessions[activeSession.id].update({
          cancelledAt: DateTime.now().toISO(),
        })
      );
    }

    setActiveSession(null);
    setRemainingTime(0);
    setIsPaused(false);
  };

  const claimReward = async (session: Session) => {
    if (session.rewardsClaimedAt) return;

    setClaimingReward(true);

    try {
      // Call the server-side pack creation API
      const response = await fetch("/api/claim-pack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: session.id,
          userId: user?.id,
          sessionDuration: session.timeInSeconds,
          sessionIdFallback: effectiveSessionId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to claim pack");
      }

      const result = await response.json();

      // Track pack claimed
      const packType = result.packSize === 5 ? "large" : "standard";
      trackPackClaimed(packType);

      // Show pack opening animation with the server-generated rewards
      setPackOpeningRewards(result.rewardBlocks);
      setShowPackOpening(true);

      // If this was the active session, clear it
      if (activeSession?.id === session.id) {
        setActiveSession(null);
      }
    } catch (error) {
      console.error("Error claiming pack:", error);
      // Show error to user
      alert("Failed to claim pack. Please try again.");
    } finally {
      setClaimingReward(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      // If permission was previously denied, we can't request again programmatically
      if (Notification.permission === "denied") {
        alert(
          'Notifications are blocked. Please enable them in your browser settings:\n\n1. Click the lock icon in the address bar\n2. Find "Notifications" \n3. Change from "Block" to "Allow"\n4. Refresh the page'
        );
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
      } catch (error) {
        console.error("Error requesting notification permission:", error);
      }
    }
  };

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }, []);

  const formatSessionTime = useCallback((session: Session) => {
    const mins = Math.floor(session.timeInSeconds / 60);
    return `${mins} min`;
  }, []);

  // Update time/date less frequently
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
  const [currentDate, setCurrentDate] = useState(() => {
    const date = new Date();
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return dateStr.replace(/(\d+)/, (match) => {
      const day = parseInt(match);
      const suffix =
        day === 1 || day === 21 || day === 31
          ? "st"
          : day === 2 || day === 22
          ? "nd"
          : day === 3 || day === 23
          ? "rd"
          : "th";
      return day + suffix;
    });
  });

  // Update time every minute instead of every render
  useEffect(() => {
    const updateDateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
      const date = new Date();
      const dateStr = date.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      setCurrentDate(
        dateStr.replace(/(\d+)/, (match) => {
          const day = parseInt(match);
          const suffix =
            day === 1 || day === 21 || day === 31
              ? "st"
              : day === 2 || day === 22
              ? "nd"
              : day === 3 || day === 23
              ? "rd"
              : "th";
          return day + suffix;
        })
      );
    };

    const interval = setInterval(updateDateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: isOpen ? "0%" : "-100%" }}
        transition={{
          duration: 0.15,
          ease: "easeOut",
          type: "tween",
        }}
        ref={mainSlideoverRef}
        className={`fixed left-2 top-2 overflow-y-auto bg-white dark:bg-neutral-900 dark:border border-neutral-200 dark:border-neutral-800 backdrop-blur-md rounded-xl strong-shadow z-50`}
        style={{
          width: "100%",
          maxWidth: "24rem",
          maxHeight: "80%",
          WebkitOverflowScrolling: "touch",
          willChange: "transform",
        }}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div
          className="flex flex-col divide-y divide-dashed divide-neutral-200"
          style={{ height: "100%" }}
        >
          <div className="p-4 sticky top-0 bg-white dark:bg-neutral-900 dark:border-neutral-800 z-50">
            <div className="flex flex-row justify-between items-start font-barlow mb-2">
              <div className="flex flex-col p-1 rounded-md">
                <h1 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {currentTime}
                </h1>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-500">
                  {currentDate}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* <ThemeToggle /> */}
                <AuthButton />
              </div>

              {/* {activeTab !== null && (
              <button
                onClick={() => setActiveTab(null as any)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Collapse view"
              >
                <ArrowsOutSimpleIcon size={14} weight="bold" className="text-gray-800" />
              </button>
              )} */}
            </div>
            <div className="flex flex-row">
              <Tabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                sessions={sessions}
                blockInventory={blockInventory}
                user={user}
                profile={profile}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
              />
            </div>
          </div>
          <AnimatePresence mode="wait">
            {activeTab && isExpanded && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, type: "tween" }}
                className="p-4 flex-1 min-h-0"
              >
                {activeTab === "timer" && (
                  <div className="h-full">
                    <div className="rounded-lg space-y-4">
                      {!activeSession ? (
                        <>
                          {/* Timer Mode Selector */}
                          <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                            <button
                              onClick={() => setTimerMode("focus")}
                              className={`flex-1 px-3 py-2 rounded-md text-xs font-medium font-mono uppercase transition-colors cursor-pointer ${
                                timerMode === "focus"
                                  ? "bg-green-600 text-white"
                                  : "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700"
                              }`}
                            >
                              Focus
                            </button>
                            <button
                              onClick={() => setTimerMode("break")}
                              className={`flex-1 px-3 py-2 rounded-md text-xs font-medium font-mono uppercase transition-colors cursor-pointer ${
                                timerMode === "break"
                                  ? "bg-blue-600 text-white"
                                  : "text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700"
                              }`}
                            >
                              Break
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-neutral-900 dark:text-neutral-200 font-barlow font-semibold uppercase">
                                Duration
                              </span>
                              <NumberFlow
                                value={timerMinutes}
                                suffix=" MIN"
                                className="text-sm font-semibold font-barlow text-neutral-900 dark:text-neutral-200"
                              />
                            </div>
                            <div className="relative">
                              <input
                                type="range"
                                min={timerMode === "break" ? "1" : "5"}
                                max={timerMode === "break" ? "15" : "120"}
                                step={timerMode === "break" ? "1" : "1"}
                                value={timerMinutes}
                                onChange={(e) =>
                                  setTimerMinutes(parseInt(e.target.value))
                                }
                                className={`w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer slider ${
                                  timerMode === "break" ? "slider-break" : ""
                                }`}
                                style={{
                                  background:
                                    timerMode === "break"
                                      ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                                          ((timerMinutes - 1) / 14) * 100
                                        }%, #e5e7eb ${
                                          ((timerMinutes - 1) / 14) * 100
                                        }%, #e5e7eb 100%)`
                                      : `linear-gradient(to right, #10b981 0%, #10b981 ${
                                          ((timerMinutes - 5) / 115) * 100
                                        }%, #e5e7eb ${
                                          ((timerMinutes - 5) / 115) * 100
                                        }%, #e5e7eb 100%)`,
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs font-barlow font-medium text-neutral-500 dark:text-neutral-500">
                              {timerMode === "break" ? (
                                <>
                                  <span>1</span>
                                  <span>5</span>
                                  <span>10</span>
                                  <span>15</span>
                                </>
                              ) : (
                                <>
                                  <span>5</span>
                                  <span>25</span>
                                  <span>45</span>
                                  <span>60</span>
                                  <span>120</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Quick Presets */}
                          <div className="space-y-2 mt-4">
                            <div className="text-xs text-neutral-900 dark:text-neutral-200 font-barlow font-semibold uppercase">
                              Quick Select
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {timerMode === "break" ? (
                                <>
                                  {[1, 5, 10, 15].map((mins) => (
                                    <button
                                      key={mins}
                                      onClick={() => setTimerMinutes(mins)}
                                      className={`px-3 py-1.5 rounded-md text-sm font-medium font-barlow transition-colors ${
                                        timerMinutes === mins
                                          ? "bg-blue-600 text-white"
                                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                      }`}
                                    >
                                      {mins} {mins === 1 ? "min" : "mins"}
                                    </button>
                                  ))}
                                </>
                              ) : (
                                <>
                                  {[5, 15, 25, 30, 45, 60].map((mins) => (
                                    <button
                                      key={mins}
                                      onClick={() => setTimerMinutes(mins)}
                                      className={`px-3 py-1.5 rounded-md text-sm font-medium font-barlow transition-colors ${
                                        timerMinutes === mins
                                          ? "bg-green-600 text-white"
                                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                      }`}
                                    >
                                      {mins} {mins === 1 ? "min" : "mins"}
                                    </button>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Custom Time Input */}
                          <div className="space-y-2 mt-4">
                            <div className="text-xs text-neutral-900 dark:text-neutral-200 font-barlow font-semibold uppercase">
                              Custom Time
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-row w-full">
                                <input
                                  type="number"
                                  min={timerMode === "break" ? 1 : 5}
                                  max={timerMode === "break" ? 15 : 120}
                                  value={timerMinutes}
                                  onChange={(e) => {
                                    const numValue = parseInt(e.target.value);
                                    if (!isNaN(numValue)) {
                                      const min = timerMode === "break" ? 1 : 5;
                                      const max =
                                        timerMode === "break" ? 15 : 120;
                                      const clamped = Math.max(
                                        min,
                                        Math.min(max, numValue)
                                      );
                                      setTimerMinutes(clamped);
                                    }
                                  }}
                                  className="flex-1 w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-l-lg text-sm focus:outline-none border-r-0 focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-neutral-800 dark:text-neutral-200"
                                  placeholder={`${
                                    timerMode === "break" ? "1-15" : "5-120"
                                  } minutes`}
                                />
                                <span className="text-xs shrink-0 flex items-center justify-center text-neutral-500 dark:text-neutral-500 font-medium border border-l-0 border-neutral-300 dark:border-neutral-700 rounded-r-lg px-2 dark:bg-neutral-800 dark:text-neutral-200">
                                  min
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => startTimer()}
                            className={`text-sm w-full text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                              timerMode === "break"
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                            disabled={!effectiveSessionId}
                          >
                            <PlayIcon size={12} weight="fill" />
                            Start {timerMode === "break"
                              ? "Break"
                              : "Focus"}{" "}
                            Timer
                          </button>

                          {notificationPermission === "denied" && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3 text-xs text-center">
                              <BellIcon
                                size={20}
                                weight="fill"
                                className="text-yellow-600 mx-auto mb-2"
                              />
                              <p className="text-yellow-800 font-medium mb-1">
                                Notifications Disabled
                              </p>
                              <p className="text-yellow-700 mb-2">
                                Enable notifications to get alerts when your
                                timer completes.
                              </p>
                              <button
                                onClick={requestNotificationPermission}
                                className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700 transition-colors flex items-center gap-1 mx-auto"
                              >
                                <BellIcon size={12} weight="fill" />
                                Try Again
                              </button>
                            </div>
                          )}
                          {notificationPermission === "default" && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3 text-xs text-center">
                              <BellIcon
                                size={20}
                                weight="fill"
                                className="text-blue-600 mx-auto mb-2"
                              />
                              <p className="text-blue-800 font-medium mb-1">
                                Enable Notifications?
                              </p>
                              <p className="text-blue-700 mb-2">
                                Get alerts when your focus session completes.
                              </p>
                              <button
                                onClick={requestNotificationPermission}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1 mx-auto"
                              >
                                <BellIcon size={12} weight="fill" />
                                Enable Notifications
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Show timer view only if session is not completed */}
                          {!activeSession.completedAt && remainingTime > 0 ? (
                            <>
                              <div className="text-center">
                                {activeSession.type === "break" && (
                                  <div className="text-xs font-mono uppercase text-blue-500 mb-1 font-semibold">
                                    Break Time
                                  </div>
                                )}
                                <TimerDisplay remainingTime={remainingTime} />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={pauseTimer}
                                  className="flex-1 text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-500 dark:text-blue-200 px-4 py-2 rounded-lg hover:bg-blue-500 hover:text-white dark:hover:bg-blue-800 dark:hover:text-blue-200 transition-colors flex items-center justify-center gap-2"
                                  disabled={!!activeSession.completedAt}
                                >
                                  {isPaused ? (
                                    <>
                                      <PlayIcon size={12} weight="fill" />
                                      Resume
                                    </>
                                  ) : (
                                    <>
                                      <PauseIcon size={12} weight="fill" />
                                      Pause
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={cancelTimer}
                                  className="flex-1 text-sm font-medium bg-red-100 dark:bg-red-900 text-red-500 dark:text-red-200 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white dark:hover:bg-red-800 dark:hover:text-red-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            /* Timer completed - show completion message and reset */
                            <div className="text-center py-4">
                              <div className="mb-4">
                                {activeSession.type === "break" ? (
                                  <SparkleIcon
                                    size={48}
                                    weight="fill"
                                    className="text-blue-500 mx-auto mb-2"
                                  />
                                ) : (
                                  <CheckIcon
                                    size={48}
                                    weight="bold"
                                    className="text-green-600 mx-auto mb-2"
                                  />
                                )}
                                <h3 className="text-lg font-semibold text-gray-800">
                                  {activeSession.type === "break"
                                    ? "Break Complete!"
                                    : "Session Complete!"}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {activeSession.type === "break"
                                    ? "Hope you're refreshed and ready to grow!"
                                    : `Great job! You completed a ${Math.floor(
                                        activeSession.timeInSeconds / 60
                                      )} minute focus session.`}
                                </p>
                              </div>

                              {activeSession.type === "break" ? (
                                <button
                                  onClick={() => {
                                    setActiveSession(null);
                                    setRemainingTime(0);
                                  }}
                                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium w-full"
                                >
                                  Start Focus Session
                                </button>
                              ) : !activeSession.rewardsClaimedAt ? (
                                <button
                                  onClick={() => claimReward(activeSession)}
                                  disabled={claimingReward}
                                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2 mx-auto text-sm font-medium disabled:opacity-75 w-full"
                                >
                                  {claimingReward ? (
                                    <>
                                      <CircleNotchIcon
                                        size={20}
                                        weight="bold"
                                        className="animate-spin"
                                      />
                                      Opening Pack...
                                    </>
                                  ) : (
                                    <>
                                      <PackageIcon size={20} weight="fill" />
                                      Claim Your Pack (
                                      {activeSession.timeInSeconds >= 3600
                                        ? "6"
                                        : "3"}{" "}
                                      Seeds)
                                    </>
                                  )}
                                </button>
                              ) : (
                                <>
                                  <div className="text-sm text-green-600 mb-4 flex items-center justify-center gap-1">
                                    <CheckIcon size={16} weight="bold" />
                                    Pack Claimed!
                                  </div>
                                  <button
                                    onClick={() => {
                                      setActiveSession(null);
                                      setRemainingTime(0);
                                    }}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm w-full"
                                  >
                                    Start New Timer
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Sessions Tab */}
                {/* {activeTab === 'sessions' && (
            <div className="flex-1 overflow-y-auto">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Your Sessions</h2>
              {isLoading ? (
                <div className="text-sm text-gray-500">Loading sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="text-sm text-gray-500">No sessions yet. Start your first timer!</div>
              ) : (
                <div className="space-y-2">
                  {sessions
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, 10)
                    .map((session) => (
                    <div
                      key={session.id}
                      className="bg-gray-50 rounded-lg p-3 text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-800">
                            {formatSessionTime(session)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(session.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {session.completedAt && !session.rewardsClaimedAt && (
                            <span className="text-xs text-yellow-600">Unclaimed</span>
                          )}
                          {session.rewardsClaimedAt && (
                            <PackageIcon size={14} weight="fill" className="text-yellow-600" />
                          )}
                          {session.completedAt && (
                            <CheckIcon size={14} weight="bold" className="text-green-600" />
                          )}
                          {session.paused && !session.completedAt && (
                            <PauseIcon size={14} weight="fill" className="text-orange-600" />
                          )}
                          {activeSession?.id === session.id && !session.completedAt && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )} */}

                {/* Packs Tab */}
                {activeTab === "packs" && (
                  <div className="flex-1">
                    {isLoading ? (
                      <div className="text-sm text-gray-500">
                        Loading packs...
                      </div>
                    ) : (
                      <>
                        {sessionsWithUnclaimedRewards.length === 0 ? (
                          <div className="text-sm text-neutral-500  text-center py-8">
                            <PackageIcon
                              size={24}
                              className="mx-auto mb-2 text-neutral-400 dark:text-neutral-600"
                            />
                            <p className="text-neutral-900 text-xs dark:text-neutral-200 font-barlow font-semibold uppercase">
                              No packs to open
                            </p>
                            <p className="text-xs mt-1 text-neutral-600 dark:text-neutral-400">
                              Complete timers to earn packs
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {sessionsWithUnclaimedRewards
                              .sort((a, b) => b.createdAt - a.createdAt)
                              .map((session) => {
                                const minutes = Math.floor(
                                  session.timeInSeconds / 60
                                );
                                const packSize = minutes >= 60 ? 6 : 3;

                                return (
                                  <button
                                    key={session.id}
                                    onClick={() =>
                                      claimReward(session as Session)
                                    }
                                    disabled={claimingReward}
                                    className="relative bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-900 dark:to-amber-800 rounded-md overflow-hidden border-2 border-amber-300 dark:border-amber-800 transition-all transform hover:scale-110 hover:shadow-lg group hover:rotate-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ aspectRatio: "3/4" }}
                                  >
                                    {/* Top tear strip */}
                                    <div
                                      className="absolute top-0 left-0 right-0 h-3 bg-amber-400 dark:bg-amber-600 border-b border-amber-500 dark:border-amber-800"
                                      style={{
                                        backgroundImage:
                                          "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 6px)",
                                      }}
                                    >
                                      <div className="absolute top-0.5 left-2 text-[6px] font-mono text-amber-800 dark:text-amber-200">
                                        TEAR HERE
                                      </div>
                                    </div>

                                    {/* Main content */}
                                    <div className="p-3 pt-5 h-full flex flex-col justify-between">
                                      {/* Header */}
                                      <div>
                                        <div className="text-center mb-2">
                                          <h3 className="text-[10px] font-mono text-amber-900 dark:text-amber-200 font-bold">
                                            GARDEN GROVE CO.
                                          </h3>
                                          <p className="text-[8px] text-amber-700 dark:text-amber-300">
                                            Premium Seeds Since 2024
                                          </p>
                                        </div>

                                        {/* Product name */}
                                        <div className="bg-green-700 text-white dark:text-green-200 py-1 px-2 rounded-sm mb-2">
                                          <p className="text-xs font-bold text-center">
                                            MYSTERY PACK
                                          </p>
                                          <p className="text-[10px] text-center opacity-90">
                                            {packSize} Premium Seeds
                                          </p>
                                        </div>

                                        {/* Decorative plant illustration */}
                                        <div className="flex justify-center mb-2">
                                          <FlowerLotusIcon
                                            size={24}
                                            className="text-green-600"
                                          />
                                        </div>
                                      </div>

                                      {/* Bottom section */}
                                      <div>
                                        {/* Growing instructions */}
                                        <div className="text-[7px] text-amber-800 dark:text-amber-200 mb-2 leading-tight">
                                          <p className="font-bold">
                                            PLANTING INSTRUCTIONS:
                                          </p>
                                          <p>1. Place in garden grid</p>
                                          <p>2. Water regularly with focus</p>
                                          <p>3. Watch them grow!</p>
                                        </div>

                                        {/* Barcode */}
                                        <div className="bg-white dark:bg-neutral-800 p-1 rounded-sm border border-gray-300 dark:border-neutral-800">
                                          <div className="flex items-end justify-center gap-0.5">
                                            {/* Static barcode pattern */}
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "2px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "1px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "1px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "2px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "1px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "2px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "2px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "1px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "1px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "1px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "2px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "1px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "2px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "1px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "1px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "2px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "1px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "2px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "1px",
                                                height: "16px",
                                              }}
                                            />
                                            <div
                                              className="bg-black dark:bg-neutral-200"
                                              style={{
                                                width: "2px",
                                                height: "16px",
                                              }}
                                            />
                                          </div>
                                          <p className="text-[6px] text-center mt-0.5 font-mono text-neutral-800 dark:text-neutral-200">
                                            {session.id
                                              .substring(0, 12)
                                              .toUpperCase()}
                                          </p>
                                        </div>

                                        {/* Bottom details */}
                                        <div className="flex justify-between items-center mt-1">
                                          <p className="text-[6px] text-amber-700 dark:text-amber-300">
                                            LOT #2847
                                          </p>
                                          <p className="text-[6px] text-amber-700 dark:text-amber-300">
                                            NET WT. {packSize * 0.5}g
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Hover shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none" />

                                    {/* Loading overlay */}
                                    {claimingReward && (
                                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-2">
                                          <CircleNotchIcon
                                            size={32}
                                            weight="bold"
                                            className="animate-spin text-amber-600"
                                          />
                                          <span className="text-xs font-medium text-amber-800">
                                            Opening Pack...
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === "blocks" && (
                  <div className="h-full overflow-y-auto">
                    {Object.keys(blockInventory).length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-8">
                        {/* <FlowerLotusIcon size={24} className="mx-auto mb-2 text-gray-400" /> */}
                        <p className="text-xs uppercase text-neutral-900 dark:text-neutral-200 font-barlow font-semibold">
                          No blocks yet
                        </p>
                        <p className="text-xs mt-1 max-w-xs mx-auto text-neutral-600 dark:text-neutral-400">
                          Complete some focus sessions to earn blocks
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(blockInventory).map(([type, count]) => {
                          const blockType = BLOCK_TYPES[type as BlockTypeId];
                          if (!blockType) return null;

                          return (
                            <div
                              key={type}
                              className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 text-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              onClick={() => {
                                if (onSelectBlockType) {
                                  onSelectBlockType(type);
                                  // Don't close the slideover when selecting a block
                                }
                              }}
                            >
                              <div className="relative">
                                <img
                                  src={getBlockDisplayImage(blockType) || ""}
                                  alt={blockType.name}
                                  className="w-16 h-16 mx-auto mb-2 pixelated"
                                />
                                <span className="absolute top-0 right-0 bg-green-600 text-white  text-xs px-1.5 py-0.5 rounded">
                                  {count}
                                </span>
                              </div>
                              <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                {blockType.name}
                              </div>
                              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 uppercase font-semibold">
                                Click to place
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "updates" && (
                  <div className="flex-1 overflow-y-auto">
                    <div className="space-y-2">
                      {UPDATES.sort(
                        (a, b) =>
                          DateTime.fromISO(b.date).toMillis() -
                          DateTime.fromISO(a.date).toMillis()
                      ).map((update) => (
                        <div
                          key={update.id}
                          className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3"
                        >
                          <h4 className="text-sm font-barlow font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                            {update.title}
                          </h4>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            {update.description}
                          </p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed mt-1">
                            {DateTime.fromISO(update.date).toRelative()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Help Tab */}
                {activeTab === "help" && (
                  <div className="flex-1 overflow-y-auto">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-barlow font-semibold text-neutral-400 dark:text-neutral-500">
                              01
                            </span>
                            <div className="flex-1">
                              <h4 className="text-sm font-barlow font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                                SET TIMER
                              </h4>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                Choose a duration between 5-60 minutes for your
                                focus session. Stay focused to complete the
                                session.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-barlow font-semibold text-neutral-400 dark:text-neutral-500">
                              02
                            </span>
                            <div className="flex-1">
                              <h4 className="text-sm font-barlow font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                                EARN PACKS
                              </h4>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                Complete sessions to earn seed packs. Sessions
                                under 60 minutes give 3 seeds, 60+ minutes give
                                6 seeds.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-barlow font-semibold text-neutral-400 dark:text-neutral-500">
                              03
                            </span>
                            <div className="flex-1">
                              <h4 className="text-sm font-barlow font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                                OPEN PACKS
                              </h4>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                Click on earned packs to reveal random seeds.
                                Each pack guarantees at least one plant.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-barlow font-semibold text-neutral-400 dark:text-neutral-500">
                              04
                            </span>
                            <div className="flex-1">
                              <h4 className="text-sm font-barlow font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                                PLANT SEEDS
                              </h4>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                Select a seed from your inventory, then click on
                                the garden grid to plant it.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-3 border-neutral-200 dark:border-neutral-800 border-dashed">
                        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                          <h4 className="text-xs uppercase font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                            SEED RARITY
                          </h4>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-600 dark:text-neutral-400">
                                Common
                              </span>
                              <span className=" text-neutral-500 dark:text-neutral-400 font-medium font-barlow">
                                60%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-600 dark:text-neutral-400">
                                Uncommon
                              </span>
                              <span className=" text-neutral-500 dark:text-neutral-400 font-medium font-barlow">
                                30%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-600 dark:text-neutral-400">
                                Rare
                              </span>
                              <span className=" text-neutral-500 dark:text-neutral-400 font-medium font-barlow">
                                8%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-600 dark:text-neutral-400">
                                Legendary
                              </span>
                              <span className=" text-neutral-500 dark:text-neutral-400 font-medium font-barlow">
                                2%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Supporter Tab */}
                {activeTab === "supporter" && (
                  <SupporterTab profile={profile} />
                )}

                {activeTab === "about" && <AboutTab />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Controls hint - bottom right */}
      <div className="fixed bottom-2 right-2 rounded-lg p-2 text-right">
        <div className="space-y-0.5 text-[10px] text-gray-600">
          <div>Scroll to zoom</div>
          <div>Alt + drag to pan</div>
          <div>Ctrl + click to move items</div>
        </div>
      </div>

      {/* Pack Opening Modal */}
      <PackOpeningModal
        isOpen={showPackOpening}
        rewards={packOpeningRewards}
        onClose={() => setShowPackOpening(false)}
      />
    </>
  );
});

export default MainSlideover;
