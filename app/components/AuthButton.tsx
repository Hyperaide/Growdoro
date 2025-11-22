"use client";

import { useAuth } from "../contexts/auth-context";
import {
  SignOutIcon,
  SignInIcon,
  CheckIcon,
  SealCheckIcon,
} from "@phosphor-icons/react";

export default function AuthButton() {
  const { user, profile, isLoading, signOut, setShowLoginModal } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={() => setShowLoginModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg hover:bg-green-600 hover:text-white transition-colors"
      >
        <SignInIcon size={16} weight="bold" />
        <span className="text-sm font-medium">Sign In</span>
      </button>
    );
  }

  // User is authenticated but profile is still being created
  if (!profile) {
    return <></>;
  }

  return (
    <div className="flex items-center gap-2 px-1 py-1 border border-neutral-200 dark:border-neutral-800 rounded-lg">
      <img
        src={`https://api.dicebear.com/9.x/glass/svg?seed=${profile.username}`}
        alt="Profile"
        width={18}
        height={18}
        className="rounded-md"
      />
      <div className="flex flex-row items-center gap-2">
        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {profile.username}
        </span>
        {profile.supporter && (
          <div className="flex flex-row items-center gap-1 bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 rounded-lg px-2 py-1">
            <span className="text-xs text-sky-800 dark:text-sky-200">
              Supporter
            </span>
            <SealCheckIcon size={16} weight="fill" className="text-sky-500" />
          </div>
        )}
        <button
          onClick={signOut}
          className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 text-left"
        >
          <SignOutIcon size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
