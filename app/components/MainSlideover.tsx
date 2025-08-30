'use client'
import { XIcon, TimerIcon, PlayIcon, PauseIcon, CheckIcon, PackageIcon, PlantIcon, FlowerLotusIcon, ListChecksIcon, ArrowsOutSimpleIcon, BellIcon, SealCheckIcon, SparkleIcon, CircleNotchIcon } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { useRef, useState, useEffect, useMemo, useCallback, memo } from "react";
import { db } from "../../lib/db";
import { id } from "@instantdb/react";
import { BLOCK_TYPES, BlockTypeId } from "../constants/blocks";
import PackOpeningModal from "./PackOpeningModal";
import NumberFlow, { NumberFlowGroup } from '@number-flow/react'
import posthog from "posthog-js";
import { useAuth } from '../contexts/auth-context';
import AuthButton from "./AuthButton";
import { DateTime } from "luxon";
import { UPDATES } from "../constants/updates";

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
  const STORAGE_KEY = 'gardenspace_session_id';
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
    <div className="text-4xl font-barlow font-bold text-gray-800">
      <NumberFlowGroup>
        <div style={{ fontVariantNumeric: 'tabular-nums', '--number-flow-char-height': '0.85em' } as React.CSSProperties}>
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

TimerDisplay.displayName = 'TimerDisplay';

// Supporter Tab Component
const SupporterTab = memo(({ profile }: { profile: any }) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelSubscription = async () => {
    if (!profile?.stripeDetails?.subscriptionId) return;
    
    setIsCancelling(true);
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        console.error('Failed to cancel subscription:', result.error);
        alert('Failed to cancel subscription. Please try again.');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!profile?.stripeDetails?.subscriptionId) return;
    
    setIsReactivating(true);
    try {
      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        console.error('Failed to reactivate subscription:', result.error);
        alert('Failed to reactivate subscription. Please try again.');
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      alert('Failed to reactivate subscription. Please try again.');
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
          <h3 className="font-semibold text-neutral-800 flex flex-row items-center gap-2 text-sm">
            <SparkleIcon size={16} weight="fill" className="text-green-600" />
            Free Forever
          </h3>
          <p className="text-neutral-600 text-xs">
            Growdoro will always be free to use. Enjoy unlimited pomodoro sessions and grow your infinite garden.
          </p>
        </div>

        {isSupporter ? (
          // Supporter Management UI
          <div className="space-y-4">
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
              <h3 className="font-semibold text-neutral-800 mb-2 flex items-center gap-2 text-sm">
                <SealCheckIcon size={16} weight="fill" className="text-sky-600" />
                Supporter Status
              </h3>
              <div className="space-y-2">
                <div className="text-xs text-neutral-600">
                  <span className="font-medium">Status:</span> Active Supporter
                </div>
                {supporterUntil && (
                  <div className="text-xs text-neutral-600">
                    <span className="font-medium">Renews:</span> {DateTime.fromISO(supporterUntil).toLocaleString(DateTime.DATE_MED)}
                  </div>
                )}
                {cancelAtPeriodEnd && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    <span className="font-medium">Subscription will be cancelled</span> at the end of the current billing period.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
              <h4 className="font-medium text-neutral-800 text-xs mb-2">Supporter Benefits</h4>
              <ul className="text-xs text-neutral-600 space-y-1">
                <li>• Early access to new features</li>
                <li>• Exclusive plants and decorations</li>
                <li>• 4 exclusive decoration blocks per year</li>
                <li>• Supporter badge on your profile</li>
              </ul>
            </div>

            <div className="border-t pt-4">
              {cancelAtPeriodEnd ? (
                <button
                  onClick={handleReactivateSubscription}
                  disabled={isReactivating}
                  className="w-full text-xs flex flex-row items-center justify-center gap-2 font-medium text-center bg-green-100 text-green-700 px-4 py-3 rounded-lg hover:bg-green-200 transition-colors border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReactivating ? 'Reactivating...' : 'Reactivate Subscription'}
                </button>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full text-xs flex flex-row items-center justify-center gap-2 font-medium text-center bg-red-100 text-red-700 px-4 py-3 rounded-lg hover:bg-red-200 transition-colors border border-red-200"
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
                <SealCheckIcon size={16} weight="fill" className="text-sky-600" />
                Become a Supporter
              </h3>
              <p className="text-neutral-600 text-xs mb-3">
                If you want to support Growdoro and unlock some exclusive stuff, you can become a supporter. It's <span className="font-semibold text-sky-600">$10 a year.</span>
              </p>
              <p className="text-neutral-600 text-xs mb-3">
                You get early access to new features, exclusive plants, 4 exclusive decorations blocks a year and a little badge on your profile ☺️
              </p>
            </div>

            <div className="mt-4">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(`${process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}?client_reference_id=${profile?.id}`, '_blank');
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
              <h3 className="font-semibold text-neutral-800 mb-3">Cancel Subscription?</h3>
              <p className="text-neutral-600 text-sm mb-4">
                Your subscription will be cancelled at the end of the current billing period. You'll keep your supporter benefits until then.
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
                  {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

SupporterTab.displayName = 'SupporterTab';

export default function MainSlideover({ isOpen, onClose, selectedBlockType, onSelectBlockType }: MainSlideoverProps) {
  const mainSlideoverRef = useRef<HTMLDivElement>(null);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [browserSessionId, setBrowserSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'timer' | 'sessions' | 'blocks' | 'packs' | 'help' | 'supporter' | 'updates' | null>('timer');
  const [claimingReward, setClaimingReward] = useState(false);
  const [packOpeningRewards, setPackOpeningRewards] = useState<string[]>([]);
  const [showPackOpening, setShowPackOpening] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
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
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);
  
  // Handle tab visibility changes - removed since we're using a simpler countdown approach

  // Query sessions and blocks for this browser session
  const { data, isLoading } = db.useQuery(effectiveSessionId ? {
    sessions: {
      $: {
        where: user ? {
          'user.id': user.id,
          cancelledAt: { $isNull: true }
        } : {
          sessionId: effectiveSessionId,
          cancelledAt: { $isNull: true }
        }
      }
    },
    blocks: {
      $: {
        where: user ? {
          'user.id': user.id,
          x: { $isNull: true }
        } : {
          sessionId: effectiveSessionId,
          x: { $isNull: true }
        }
      }
    }
  } : null);

  const sessions = data?.sessions || [];
  const unplacedBlocks = data?.blocks || [];

  // Memoize expensive calculations
  const sessionsWithUnclaimedRewards = useMemo(() => {
    return sessions.filter(session => {
      const sessionDuration = session.timeInSeconds * 1000;
      const sessionStartedAt = session.createdAt;
      const now = DateTime.now().toMillis();
      const timeElapsed = now - sessionStartedAt;
      return (timeElapsed >= sessionDuration) && !session.timeRemaining && !session.paused && !session.rewardsClaimedAt;
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
      .filter(s => !s.completedAt)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (latestActive) {
      // If the session has a stored timeRemaining (was paused), use that
      // Otherwise calculate remaining time based on when it was created
      let remaining;
      
      if (latestActive.timeRemaining !== undefined && latestActive.timeRemaining !== null) {
        // Use the stored timeRemaining from when it was paused
        remaining = latestActive.timeRemaining;
      } else {
        // Calculate remaining time based on elapsed time
        const elapsed = Math.floor((Date.now() - latestActive.createdAt) / 1000);
        remaining = Math.max(0, latestActive.timeInSeconds - elapsed);
      }
      
      if (remaining > 0) {
        setActiveSession(latestActive);
        setRemainingTime(remaining);
        setIsPaused(latestActive.paused || false);
      } else {
        // Timer has expired while the page was closed, mark it as completed
        db.transact(
          db.tx.sessions[latestActive.id].update({
            completedAt: Date.now()
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
      const timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      document.title = `${timeString} - Growdoro`;
    } else {
      document.title = 'Growdoro';
    }
  }, [activeSession, remainingTime]);

  // Handle timer completion
  useEffect(() => {
    if (activeSession && remainingTime === 0 && !activeSession.completedAt) {
      // Show browser notification first, before updating the database
      const showNotification = async () => {
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('Timer Complete! 🌱', {
              body: `Your ${Math.floor(activeSession.timeInSeconds / 60)} minute focus session is complete. Claim your seed pack!`,
              icon: '/plants/morning-glory.png', // Using an existing plant image as icon
              tag: 'timer-complete',
              requireInteraction: false
            });
          } else if (Notification.permission !== 'denied') {
            // Request permission if not already denied
            try {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                new Notification('Timer Complete! 🌱', {
                  body: `Your ${Math.floor(activeSession.timeInSeconds / 60)} minute focus session is complete. Claim your seed pack!`,
                  icon: '/plants/morning-glory.png',
                  tag: 'timer-complete',
                  requireInteraction: false
                });
              }
            } catch (error) {
              console.error('Error requesting notification permission:', error);
            }
          }
        }
        
        // Play a sound if possible
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
          audio.volume = 0.5;
          audio.play();
        } catch (error) {
          console.log('Could not play notification sound');
        }
      };
      
      // Show notification immediately
      showNotification();
      
      // Complete the session after a small delay to ensure notification shows
      setTimeout(() => {
        db.transact(
          db.tx.sessions[activeSession.id].update({
            completedAt: Date.now()
          })
        );
      }, 100);
    }
  }, [activeSession, remainingTime]);

  const startTimer = async () => {
    // Check if authenticated user has a profile
    if (user && !profile) {
      alert('Please complete your profile setup first!');
      return;
    }
    
    // Request notification permission when starting timer
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
    
    const newSessionId = id();
    const newSession = {
      sessionId: effectiveSessionId,
      createdAt: Date.now(),
      timeInSeconds: timerMinutes * 60,
      paused: false
    };

    // Create session with user link if authenticated
    if (user) {
      await db.transact(
        db.tx.sessions[newSessionId].update(newSession).link({
          user: user.id
        })
      );
    } else {
      await db.transact(
        db.tx.sessions[newSessionId].update(newSession)
      );
    }

    posthog.capture('timer_session_started', {
      session_id: newSessionId,
      duration: timerMinutes
    })

    const createdSession = {
      ...newSession,
      id: newSessionId
    } as Session;

    setActiveSession(createdSession);
    setRemainingTime(timerMinutes * 60);
    setIsPaused(false);
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
          timeRemaining: Math.round(remainingTime) // Store as integer seconds
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
          timeRemaining: null
        })
      );
    }
  };

  const cancelTimer = () => {
    setActiveSession(null);
    setRemainingTime(0);
    setIsPaused(false);

    if (activeSession) {
      db.transact(
        db.tx.sessions[activeSession.id].update({
          cancelledAt: DateTime.now().toISO()
        })
      );
    }
  };

  const claimReward = async (session: Session) => {
    if (session.rewardsClaimedAt) return;
    
    setClaimingReward(true);
    
    try {
      // Call the server-side pack creation API
      const response = await fetch('/api/claim-pack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          userId: user?.id,
          sessionDuration: session.timeInSeconds,
          sessionIdFallback: effectiveSessionId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim pack');
      }

      const result = await response.json();
      
      // Show pack opening animation with the server-generated rewards
      setPackOpeningRewards(result.rewardBlocks);
      setShowPackOpening(true);
      
      posthog.capture('pack_opened', {
        pack_size: result.packSize,
        session_id: session.id
      })
      
      // If this was the active session, clear it
      if (activeSession?.id === session.id) {
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Error claiming pack:', error);
      // Show error to user
      alert('Failed to claim pack. Please try again.');
    } finally {
      setClaimingReward(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      // If permission was previously denied, we can't request again programmatically
      if (Notification.permission === 'denied') {
        alert('Notifications are blocked. Please enable them in your browser settings:\n\n1. Click the lock icon in the address bar\n2. Find "Notifications" \n3. Change from "Block" to "Allow"\n4. Refresh the page');
        return;
      }
      
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatSessionTime = useCallback((session: Session) => {
    const mins = Math.floor(session.timeInSeconds / 60);
    return `${mins} min`;
  }, []);

  // Update time/date less frequently
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString());
  const [currentDate, setCurrentDate] = useState(() => {
    const date = new Date();
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
    return dateStr.replace(/(\d+)/, (match) => {
      const day = parseInt(match);
      const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                   day === 2 || day === 22 ? 'nd' :
                   day === 3 || day === 23 ? 'rd' : 'th';
      return day + suffix;
    });
  });

  // Update time every minute instead of every render
  useEffect(() => {
    const updateDateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
      const date = new Date();
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
      setCurrentDate(dateStr.replace(/(\d+)/, (match) => {
        const day = parseInt(match);
        const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                     day === 2 || day === 22 ? 'nd' :
                     day === 3 || day === 23 ? 'rd' : 'th';
        return day + suffix;
      }));
    };

    const interval = setInterval(updateDateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: isOpen ? '0%' : '-100%' }}
          transition={{ 
            duration: 0.15, 
            ease: 'easeOut',
            type: 'tween'
          }}
          ref={mainSlideoverRef}
          className={`fixed left-2 top-2 overflow-y-auto bg-white rounded-xl strong-shadow z-50 p-2`}
          style={{
            width: '100%',
            maxWidth: '24rem',
            maxHeight: '70%',
            WebkitOverflowScrolling: 'touch',
            willChange: 'transform'
          }}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
      >
        <div className="flex flex-col gap-2" style={{ height: '100%' }}>
          <div className="flex flex-row justify-between items-start font-barlow">
            <div className="flex flex-col p-2">
              <h1 className="text-sm font-medium">{currentTime}</h1>
              <p className="text-sm font-medium text-gray-500">{currentDate}</p>
            </div>

            <AuthButton />
            
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
          <div className="flex flex-row justify-between items-center ">
            <div className="flex flex-wrap items-center gap-2 w-full">
              <button 
                className={`flex flex-row items-center gap-1 px-2 py-1 rounded-lg transition-colors ${activeTab === 'timer' ? 'bg-gray-200' : 'bg-transparent hover:bg-gray-100'}`} 
                onClick={() => setActiveTab('timer')}
              >
                {/* <TimerIcon size={16} weight="bold" /> */}
                <h1 className="text-xs font-medium font-mono uppercase">Timer</h1>
              </button>
              {/* <button 
                className={`flex flex-row items-center gap-1 px-2 py-1 rounded-lg transition-colors ${activeTab === 'sessions' ? 'bg-gray-200' : 'bg-transparent hover:bg-gray-100'}`} 
                onClick={() => setActiveTab('sessions')}
              >
                <h1 className="text-xs font-medium font-mono uppercase">Sessions</h1>
              </button> */}
              <button 
                className={`flex flex-row items-center gap-1 px-2 py-1 rounded-lg transition-colors ${activeTab === 'packs' ? 'bg-gray-200' : 'bg-transparent hover:bg-gray-100'}`} 
                onClick={() => setActiveTab('packs')}
              >
                {/* <PackageIcon size={16} weight="bold" /> */}
                <h1 className="text-xs font-medium font-mono uppercase">Packs</h1>

                {sessions.filter(s => s.completedAt && !s.rewardsClaimedAt).length > 0 && (
                  <span className=" bg-green-500 rounded-full h-2 w-2 ml-1">
        
                  </span>
                )}
              </button>
              <button 
                className={`flex flex-row items-center gap-1 px-2 py-1 rounded-lg transition-colors ${activeTab === 'blocks' ? 'bg-gray-200' : 'bg-transparent hover:bg-gray-100'}`} 
                onClick={() => setActiveTab('blocks')}
              >
                {/* <PlantIcon size={16} weight="bold" /> */}
                <h1 className="text-xs font-medium font-mono uppercase">Blocks</h1>

                {Object.keys(blockInventory).length > 0 && (
                  <span className=" bg-green-500 rounded-full h-2 w-2 ml-1">
        
                  </span>
                )}
              </button>
              <button 
                className={`flex flex-row items-center gap-1 px-2 py-1 rounded-lg transition-colors ${activeTab === 'help' ? 'bg-gray-200' : 'bg-transparent hover:bg-gray-100'}`} 
                onClick={() => setActiveTab('help')}
              >
                <h1 className="text-xs font-medium font-mono uppercase">Help</h1>
              </button>
              <button 
                className={`flex flex-row items-center gap-1 px-2 py-1 rounded-lg transition-colors ${activeTab === 'updates' ? 'bg-gray-200' : 'bg-transparent hover:bg-gray-100'}`} 
                onClick={() => setActiveTab('updates')}
              >
                <h1 className="text-xs font-medium font-mono uppercase">Updates</h1>
              </button>
              {user && (
                <button 
                  className={`flex flex-row items-center gap-1 px-2 py-1 rounded-lg transition-colors ${activeTab === 'supporter' ? 'bg-gray-200' : 'bg-transparent hover:bg-gray-100'}`} 
                  onClick={() => setActiveTab('supporter')}
                >
                  <h1 className="text-xs font-medium font-mono uppercase">
                    {profile?.supporter ? 'Manage' : 'Supporter'}
                  </h1>
                </button>
              )}
              

              {activeTab !== null && (
                <button
                  onClick={() => setActiveTab(null as any)}
                  className="ml-auto p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Collapse view"
                >
                  <ArrowsOutSimpleIcon size={14} weight="bold" className="text-gray-800" />
                </button>
                )}
            </div>
          </div>

          
          <AnimatePresence mode="wait">
            {activeTab && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, type: 'tween' }}
                className="flex-1"
              >
                {activeTab === 'timer' && (
                  <div className="flex-1 overflow-y-auto">
              <div className="rounded-lg p-2 space-y-4">
                {!activeSession ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-mono uppercase">Duration</span>
                        <NumberFlow value={timerMinutes} suffix=" MIN" className="text-sm font-semibold text-gray-800" />
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min="5"
                          max="60"
                          step="5"
                          value={timerMinutes}
                          onChange={(e) => setTimerMinutes(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, #10b981 0%, #10b981 ${((timerMinutes - 5) / 55) * 100}%, #e5e7eb ${((timerMinutes - 5) / 55) * 100}%, #e5e7eb 100%)`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>5</span>
                        <span>15</span>
                        <span>25</span>
                        <span>35</span>
                        <span>45</span>
                        <span>60</span>
                      </div>
                    </div>
                    <button
                      onClick={startTimer}
                      className=" bg-green-600 text-sm w-full text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      disabled={!effectiveSessionId}
                    >
                      <PlayIcon size={12} weight="fill" />
                      Start Timer
                    </button>

                    
                      {notificationPermission === 'denied' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3 text-xs text-center">
                          <BellIcon size={20} weight="fill" className="text-yellow-600 mx-auto mb-2" />
                          <p className="text-yellow-800 font-medium mb-1">Notifications Disabled</p>
                          <p className="text-yellow-700 mb-2">
                            Enable notifications to get alerts when your timer completes.
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
                      {notificationPermission === 'default' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3 text-xs text-center">
                          <BellIcon size={20} weight="fill" className="text-blue-600 mx-auto mb-2" />
                          <p className="text-blue-800 font-medium mb-1">Enable Notifications?</p>
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
                          <TimerDisplay remainingTime={remainingTime} />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={pauseTimer}
                            className="flex-1 text-xs font-medium font-mono uppercase bg-blue-100 text-blue-500 px-4 py-2 rounded-lg hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center gap-2"
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
                            className="flex-1 text-xs font-medium font-mono uppercase bg-red-100 text-red-500 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      /* Timer completed - show completion message and reset */
                      <div className="text-center py-4">
                        <div className="mb-4">
                          <CheckIcon size={48} weight="bold" className="text-green-600 mx-auto mb-2" />
                          <h3 className="text-lg font-semibold text-gray-800">Session Complete!</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Great job! You completed a {Math.floor(activeSession.timeInSeconds / 60)} minute focus session.
                          </p>
                        </div>
                        
                        {!activeSession.rewardsClaimedAt ? (
                          <button
                            onClick={() => claimReward(activeSession)}
                            disabled={claimingReward}
                            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2 mx-auto text-sm font-medium disabled:opacity-75"
                          >
                            {claimingReward ? (
                              <>
                                <CircleNotchIcon size={20} weight="bold" className="animate-spin" />
                                Opening Pack...
                              </>
                            ) : (
                              <>
                                <PackageIcon size={20} weight="fill" />
                                Claim Your Pack ({activeSession.timeInSeconds >= 3600 ? '6' : '3'} Seeds)
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
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
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
          {activeTab === 'packs' && (
            <div className="flex-1  mt-2">
              
              {isLoading ? (
                <div className="text-sm text-gray-500">Loading packs...</div>
              ) : (
                <>
                  {sessionsWithUnclaimedRewards.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-8">
                      <PackageIcon size={24} className="mx-auto mb-2 text-gray-400" />
                      <p>No packs to open!</p>
                      <p className="text-xs mt-1">Complete timers to earn packs</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {sessionsWithUnclaimedRewards
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((session) => {
                          const minutes = Math.floor(session.timeInSeconds / 60);
                          const packSize = minutes >= 60 ? 6 : 3;
                          
                          return (
                            <button
                              key={session.id}
                              onClick={() => claimReward(session)}
                              disabled={claimingReward}
                              className="relative bg-gradient-to-br from-amber-100 to-yellow-50 rounded-md overflow-hidden border-2 border-amber-300 transition-all transform hover:scale-110 hover:shadow-lg group hover:rotate-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ aspectRatio: '3/4' }}
                            >
                              {/* Top tear strip */}
                              <div className="absolute top-0 left-0 right-0 h-3 bg-amber-400 border-b border-amber-500" 
                                   style={{ 
                                     backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 6px)',
                                   }}>
                                <div className="absolute top-0.5 left-2 text-[6px] font-mono text-amber-800">TEAR HERE</div>
                              </div>
                              
                              {/* Main content */}
                              <div className="p-3 pt-5 h-full flex flex-col justify-between">
                                {/* Header */}
                                <div>
                                  <div className="text-center mb-2">
                                    <h3 className="text-[10px] font-mono text-amber-900 font-bold">GARDEN GROVE CO.</h3>
                                    <p className="text-[8px] text-amber-700">Premium Seeds Since 2024</p>
                                  </div>
                                  
                                  {/* Product name */}
                                  <div className="bg-green-700 text-white py-1 px-2 rounded-sm mb-2">
                                    <p className="text-xs font-bold text-center">MYSTERY PACK</p>
                                    <p className="text-[10px] text-center opacity-90">{packSize} Premium Seeds</p>
                                  </div>
                                  
                                  {/* Decorative plant illustration */}
                                  <div className="flex justify-center mb-2">
                                    <FlowerLotusIcon size={24} className="text-green-600" />
                                  </div>
                                </div>
                                
                                {/* Bottom section */}
                                <div>
                                  {/* Growing instructions */}
                                  <div className="text-[7px] text-amber-800 mb-2 leading-tight">
                                    <p className="font-bold">PLANTING INSTRUCTIONS:</p>
                                    <p>1. Place in garden grid</p>
                                    <p>2. Water regularly with focus</p>
                                    <p>3. Watch them grow!</p>
                                  </div>
                                  
                                  {/* Barcode */}
                                  <div className="bg-white p-1 rounded-sm border border-gray-300">
                                    <div className="flex items-end justify-center gap-0.5">
                                      {/* Static barcode pattern */}
                                      <div className="bg-black" style={{ width: '2px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '1px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '1px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '2px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '1px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '2px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '2px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '1px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '1px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '1px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '2px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '1px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '2px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '1px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '1px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '2px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '1px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '2px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '1px', height: '16px' }} />
                                      <div className="bg-black" style={{ width: '2px', height: '16px' }} />
                                    </div>
                                    <p className="text-[6px] text-center mt-0.5 font-mono">
                                      {session.id.substring(0, 12).toUpperCase()}
                                    </p>
                                  </div>
                                  
                                  {/* Bottom details */}
                                  <div className="flex justify-between items-center mt-1">
                                    <p className="text-[6px] text-amber-700">LOT #2847</p>
                                    <p className="text-[6px] text-amber-700">NET WT. {packSize * 0.5}g</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Hover shine effect */}
                              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none" />
                              
                              {/* Loading overlay */}
                              {claimingReward && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                  <div className="flex flex-col items-center gap-2">
                                    <CircleNotchIcon size={32} weight="bold" className="animate-spin text-amber-600" />
                                    <span className="text-xs font-medium text-amber-800">Opening Pack...</span>
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

          {activeTab === 'blocks' && (
            <div className="flex-1 overflow-y-auto">
              
              {Object.keys(blockInventory).length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">
                  {/* <FlowerLotusIcon size={24} className="mx-auto mb-2 text-gray-400" /> */}
                  <p className="text-xs font-mono uppercase font-medium">No seeds yet</p>
                  <p className="text-xs mt-1 max-w-xs mx-auto">Complete some pomodoro sessions to earn seeds.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(blockInventory).map(([type, count]) => {
                    const blockType = BLOCK_TYPES[type as BlockTypeId];
                    if (!blockType) return null;
                    
                    return (
                      <div
                        key={type}
                        className="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => {
                          if (onSelectBlockType) {
                            onSelectBlockType(type);
                            // Don't close the slideover when selecting a block
                          }
                        }}
                      >
                        <div className="relative">
                          <img
                            src={blockType.imagePath}
                            alt={blockType.name}
                            className="w-16 h-16 mx-auto mb-2 pixelated"
                          />
                          <span className="absolute top-0 right-0 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded">
                            {count}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-gray-700">
                          {blockType.name}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 font-mono uppercase font-medium">
                          Click to place
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {UPDATES.sort((a, b) => DateTime.fromISO(b.date).toMillis() - DateTime.fromISO(a.date).toMillis()).map((update) => (
                  <div key={update.id} className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-xs font-mono uppercase font-medium text-gray-800 mb-1">{update.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{update.description}</p>
                    <p className="text-xs text-gray-600 leading-relaxed mt-1">{DateTime.fromISO(update.date).toRelative()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Help Tab */}
          {activeTab === 'help' && (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono font-bold text-gray-400">01</span>
                      <div className="flex-1">
                        <h4 className="text-xs font-mono uppercase font-medium text-gray-800 mb-1">SET TIMER</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Choose a duration between 5-60 minutes for your focus session. Stay focused to complete the session.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono font-bold text-gray-400">02</span>
                      <div className="flex-1">
                        <h4 className="text-xs font-mono uppercase font-medium text-gray-800 mb-1">EARN PACKS</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Complete sessions to earn seed packs. Sessions under 60 minutes give 3 seeds, 60+ minutes give 6 seeds.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono font-bold text-gray-400">03</span>
                      <div className="flex-1">
                        <h4 className="text-xs font-mono uppercase font-medium text-gray-800 mb-1">OPEN PACKS</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Click on earned packs to reveal random seeds. Each pack guarantees at least one plant.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono font-bold text-gray-400">04</span>
                      <div className="flex-1">
                        <h4 className="text-xs font-mono uppercase font-medium text-gray-800 mb-1">PLANT SEEDS</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Select a seed from your inventory, then click on the garden grid to plant it.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3 border-gray-200">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-xs font-mono uppercase font-medium text-gray-800 mb-2">SEED RARITY</h4>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Common</span>
                        <span className=" text-gray-500 font-medium font-barlow">60%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Uncommon</span>
                        <span className=" text-gray-500 font-medium font-barlow">30%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Rare</span>
                        <span className=" text-gray-500 font-medium font-barlow">8%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Legendary</span>
                        <span className=" text-gray-500 font-medium font-barlow">2%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Supporter Tab */}
          {activeTab === 'supporter' && (
            <SupporterTab profile={profile} />
          )}
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
}