"use client";

import { useEffect, useState } from "react";

// Distinct from the single-image persistence key — no collision (D-03).
const STORAGE_KEY = "tobira-last-chapter";

export interface StoredChapter {
  comicUuid: string;
  pageCount: number;
}

export function useChapterPersistence() {
  const [lastChapter, setLastChapter] = useState<StoredChapter | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLastChapter(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when a chapter upload succeeds
  const saveChapter = (chapter: StoredChapter) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chapter));
    setLastChapter(chapter);
  };

  // Clear — also the stale-404 graceful-degrade primitive (D-10/D-15):
  // Plan 06 calls this when a restored comicUuid 404s after a redeploy.
  const clearChapter = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLastChapter(null);
  };

  return { lastChapter, saveChapter, clearChapter, isLoaded };
}
