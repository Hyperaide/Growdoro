'use client';

import { useEffect } from 'react';
import { useAuth } from './auth-context';
import { initPostHog, identifyUser, resetUser, setUserProperties } from '@/lib/posthog';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();

  // Initialize PostHog on mount
  useEffect(() => {
    initPostHog();
  }, []);

  // Identify user when they sign in
  useEffect(() => {
    if (user && profile) {
      identifyUser(user.id, {
        email: user.email,
        username: profile.username,
        createdAt: profile.createdAt,
        isPremium: profile.isPremium,
      });

      // Set additional user properties
      setUserProperties({
        email: user.email,
        username: profile.username,
        isPremium: profile.isPremium,
      });
    } else if (!user) {
      // Reset when user signs out
      resetUser();
    }
  }, [user, profile]);

  return <>{children}</>;
}

