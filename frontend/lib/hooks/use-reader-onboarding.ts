"use client";

import { useState, useEffect, useCallback } from "react";

const ONBOARDING_KEY = "tobira-reader-onboarding-shown";

/**
 * Hook for managing reader onboarding state.
 * Shows onboarding only on first reader open, then never again.
 */
export function useReaderOnboarding() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true); // Default to true to avoid flash

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY);
    setHasSeenOnboarding(seen === "true");
  }, []);

  const markOnboardingSeen = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setHasSeenOnboarding(true);
  }, []);

  return {
    /** True if user has already seen onboarding */
    hasSeenOnboarding,
    /** Show onboarding on next reader open */
    shouldShowOnboarding: !hasSeenOnboarding,
    /** Mark onboarding as seen */
    markOnboardingSeen,
  };
}
