"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  UserIcon,
  SparkleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  CircleNotchIcon,
  SealCheckIcon,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/app/contexts/auth-context";
import { trackProfileCreated, identifyUser } from "@/lib/events";

interface ProfileCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function ProfileCreationModal({
  isOpen,
  onClose,
  userId,
}: ProfileCreationModalProps) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<
    boolean | null
  >(null);
  const [checkTimer, setCheckTimer] = useState<NodeJS.Timeout | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const { user } = useAuth();

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(
    async (usernameToCheck: string) => {
      if (!usernameToCheck || usernameToCheck.length < 3) {
        setIsUsernameAvailable(null);
        return;
      }

      setIsCheckingUsername(true);
      setIsUsernameAvailable(null);

      try {
        const response = await fetch("/api/check-username", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username: usernameToCheck }),
        });

        const result = await response.json();

        if (response.ok) {
          setIsUsernameAvailable(result.available);
        } else {
          console.error("Error checking username:", result.error);
          setIsUsernameAvailable(null);
        }
      } catch (err) {
        console.error("Error checking username:", err);
        setIsUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    },
    []
  );

  // Check username availability when user stops typing
  useEffect(() => {
    if (checkTimer) {
      clearTimeout(checkTimer);
    }

    setError("");
    setIsUsernameAvailable(null);

    // Basic validation first
    if (!username) {
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (username.length > 20) {
      setError("Username must be less than 20 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    // Debounce the availability check
    const timer = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);

    setCheckTimer(timer);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [username, checkUsernameAvailability]);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (username.length > 20) {
      setError("Username must be less than 20 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    if (isUsernameAvailable === false) {
      setError("Username already taken");
      return;
    }

    setIsCreating(true);

    try {
      // Create profile using server-side endpoint
      const response = await fetch("/api/create-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username, userId: userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to create profile");
        setIsCreating(false);

        return;
      }

      if (result.success) {
        setProfileId(result.profileId);
        // Track profile creation
        trackProfileCreated(username.toLowerCase(), userId);

        // Identify user
        identifyUser(userId, {
          username: username.toLowerCase(),
          name: username.toLowerCase(),
          email: user?.email,
        });

        // Move to step 2
        setStep(2);
      } else {
        setError("Failed to create profile. Please try again.");
        setIsCreating(false);
      }
    } catch (err) {
      console.error("Error creating profile:", err);
      setError("Failed to create profile. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleComplete = () => {
    onClose();
  };

  const getUsernameIcon = () => {
    if (isCheckingUsername) {
      return (
        <CircleNotchIcon size={20} className="text-gray-400 animate-spin" />
      );
    }

    if (isUsernameAvailable === true) {
      return (
        <CheckCircleIcon size={20} weight="fill" className="text-green-500" />
      );
    }

    if (isUsernameAvailable === false) {
      return <XCircleIcon size={20} weight="fill" className="text-red-500" />;
    }

    return null;
  };

  const getInputBorderClass = () => {
    if (error && !isCheckingUsername) {
      return "border-red-300 focus:ring-red-500";
    }

    if (isUsernameAvailable === true) {
      return "border-green-300 focus:ring-green-500";
    }

    if (isUsernameAvailable === false) {
      return "border-red-300 focus:ring-red-500";
    }

    return "border-gray-300 focus:ring-green-500";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 font-barlow"
              >
                <div className="flex items-center justify-between text-center">
                  <h2 className="text-md font-medium text-center flex items-center gap-2">
                    Choose a username
                  </h2>
                </div>

                <p className="text-gray-600 mb-6 text-sm">
                  Choose a unique username to get started with Growdoro. This
                  will also be your link for sharing your garden.
                </p>

                <form onSubmit={handleUsernameSubmit}>
                  <div className="mb-4">
                    {/* <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                                        Username
                                    </label> */}
                    <div className="relative flex">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-l-lg px-4 py-1 border border-gray-300">
                        <p className="text-sm font-medium text-gray-700">
                          growdoro.com/
                        </p>
                      </div>
                      <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={`w-full text-sm px-4 py-2 pr-10 border border-l-0 rounded-r-lg focus:ring-0 focus:outline-none border-gray-300`}
                        placeholder="Enter your username"
                        autoFocus
                        disabled={isCreating}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {getUsernameIcon()}
                      </div>
                    </div>
                    {error && (
                      <p className="mt-2 text-sm text-red-600">{error}</p>
                    )}
                    {/* {!error && isUsernameAvailable === true && username.length >= 3 && (
                                        <p className="mt-2 text-sm text-green-600">Username is available!</p>
                                    )} */}
                    {!error && isUsernameAvailable === false && (
                      <p className="mt-2 text-sm text-red-600">
                        Username is already taken
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isCreating ||
                      isCheckingUsername ||
                      isUsernameAvailable === false ||
                      (username.length >= 3 && isUsernameAvailable === null)
                    }
                    className="w-full bg-green-600 text-white text-sm font-medium px-4 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRightIcon size={14} weight="bold" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 font-barlow"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium flex items-center gap-2">
                    {/* <SparkleIcon size={24} weight="duotone" /> */}
                    Welcome to Growdoro!
                  </h2>
                </div>

                <div className="space-y-8">
                  <div className=" rounded-lg gap-1 flex flex-col">
                    <h3 className="font-semibold text-neutral-800 flex flex-row items-center gap-2">
                      <SparkleIcon
                        size={16}
                        weight="fill"
                        className="text-green-600"
                      />
                      Free Forever
                    </h3>
                    <p className="text-neutral-600 text-sm">
                      Growdoro will always be free to use. Enjoy unlimited
                      pomodoro sessions and grow your infinite garden.
                    </p>
                  </div>

                  <div className="">
                    <h3 className="font-semibold text-neutral-800 mb-2 flex items-center gap-2">
                      <SealCheckIcon
                        size={16}
                        weight="fill"
                        className="text-sky-600"
                      />
                      Become a Supporter
                    </h3>
                    <p className="text-neutral-600 text-sm mb-3">
                      If you want to support Growdoro and unlock some exclusive
                      stuff, you can become a supporter. It's{" "}
                      <span className="font-semibold text-sky-600">
                        $10 a year.
                      </span>
                    </p>
                    <p className="text-neutral-600 text-sm mb-3">
                      You get early access to new features, exclusive plants, 4
                      exclusive decorations blocks a year and a little badge on
                      your profile ☺️
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={handleComplete}
                    className="cursor-pointer flex-1 text-sm flex flex-row items-center justify-center gap-2 font-medium bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Start Growing
                  </button>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(
                        `${process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}?client_reference_id=${profileId}`,
                        "_blank"
                      );
                    }}
                    className="flex-1 text-sm flex flex-row items-center justify-center gap-2 font-medium text-center bg-sky-600 text-white px-4 py-3 rounded-lg hover:bg-sky-700 transition-colors"
                  >
                    <SealCheckIcon
                      size={16}
                      weight="fill"
                      className="text-white"
                    />
                    Become a Supporter
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
