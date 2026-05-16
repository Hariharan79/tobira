"use client";

import { useEffect, useCallback } from "react";

/**
 * Hook for syncing panel index with URL hash (#panel=N).
 * Per SPEC: "A user shares the URL #panel=3 and the recipient lands on panel 3"
 */
export function usePanelHash() {
  /**
   * Get current panel index from hash (0-based).
   * Returns null if no hash or invalid format.
   */
  const getPanelFromHash = useCallback((): number | null => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash;
    const match = hash.match(/^#panel=(\d+)$/);
    if (!match) return null;
    const panelNum = parseInt(match[1], 10);
    // Hash uses 1-based indexing for user-friendliness, convert to 0-based
    return panelNum > 0 ? panelNum - 1 : null;
  }, []);

  /**
   * Update hash with current panel index.
   * Uses 1-based indexing for user-friendliness.
   */
  const setPanelHash = useCallback((index: number) => {
    if (typeof window === "undefined") return;
    // Use 1-based indexing in URL
    const panelNum = index + 1;
    const newHash = `#panel=${panelNum}`;
    // Use replaceState to avoid cluttering history with every panel change
    window.history.replaceState(null, "", newHash);
  }, []);

  /**
   * Clear the panel hash.
   */
  const clearPanelHash = useCallback(() => {
    if (typeof window === "undefined") return;
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return { getPanelFromHash, setPanelHash, clearPanelHash };
}

/**
 * Hook for listening to hash changes.
 */
export function useHashChange(callback: () => void) {
  useEffect(() => {
    window.addEventListener("hashchange", callback);
    return () => window.removeEventListener("hashchange", callback);
  }, [callback]);
}
