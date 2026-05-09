"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tobira-last-upload";

export interface StoredUpload {
  uuid: string;
  url: string;
}

export function useUploadPersistence() {
  const [lastUpload, setLastUpload] = useState<StoredUpload | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLastUpload(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when upload succeeds
  const saveUpload = (upload: StoredUpload) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(upload));
    setLastUpload(upload);
  };

  const clearUpload = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLastUpload(null);
  };

  return { lastUpload, saveUpload, clearUpload, isLoaded };
}
