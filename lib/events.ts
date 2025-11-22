import { trackEvent } from './posthog';

/**
 * Event tracking functions for the application
 * These help track user actions and engagement across the app
 */

// Authentication Events
export const trackSignUp = (method: 'google' | 'email') => {
  trackEvent('user_signup', { method });
};

export const trackSignIn = (method: 'google' | 'email') => {
  trackEvent('user_signin', { method });
};

export const trackSignOut = () => {
  trackEvent('user_signout');
};

export const trackProfileCreated = (username: string) => {
  trackEvent('profile_created', { username });
};

// Garden/Block Events
export const trackBlockPlaced = (blockType: string, x: number, y: number, z: number) => {
  trackEvent('block_placed', { blockType, x, y, z });
};

export const trackBlockRemoved = (blockType: string, x: number, y: number, z: number) => {
  trackEvent('block_removed', { blockType, x, y, z });
};

export const trackPlantPlanted = (plantType: string, x: number, y: number, z: number) => {
  trackEvent('plant_planted', { plantType, x, y, z });
};

export const trackPlantHarvested = (plantType: string) => {
  trackEvent('plant_harvested', { plantType });
};

// Timer/Pomodoro Events
export const trackTimerStarted = (duration: number) => {
  trackEvent('timer_started', { duration });
};

export const trackTimerCompleted = (duration: number, actualTime: number) => {
  trackEvent('timer_completed', { duration, actualTime });
};

export const trackTimerStopped = (duration: number, elapsedTime: number) => {
  trackEvent('timer_stopped', { duration, elapsedTime });
};

// Pack Events
export const trackPackOpened = (packType: string) => {
  trackEvent('pack_opened', { packType });
};

export const trackPackClaimed = (packType: string) => {
  trackEvent('pack_claimed', { packType });
};

// Subscription Events
export const trackSubscriptionStarted = (planType: string) => {
  trackEvent('subscription_started', { planType });
};

export const trackSubscriptionCancelled = () => {
  trackEvent('subscription_cancelled');
};

export const trackSubscriptionReactivated = () => {
  trackEvent('subscription_reactivated');
};

// UI Events
export const trackModalOpened = (modalName: string) => {
  trackEvent('modal_opened', { modalName });
};

export const trackModalClosed = (modalName: string) => {
  trackEvent('modal_closed', { modalName });
};

export const trackThemeToggled = (theme: 'light' | 'dark') => {
  trackEvent('theme_toggled', { theme });
};

export const trackPageViewed = (pageName: string, properties?: Record<string, any>) => {
  trackEvent('page_viewed', { pageName, ...properties });
};

// Error Events
export const trackError = (errorMessage: string, errorType: string, context?: string) => {
  trackEvent('error_occurred', { errorMessage, errorType, context });
};

// Performance Events
export const trackPerformanceMetric = (metricName: string, value: number, unit?: string) => {
  trackEvent('performance_metric', { metricName, value, unit });
};

