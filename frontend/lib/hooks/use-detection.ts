"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { detectPanels } from "@/lib/api";
import type { Panel } from "@/lib/types";

interface DetectionState {
  isDetecting: boolean;
  panels: Panel[] | null;
  contentType: "manga" | "western" | "unknown" | null;
  error: string | null;
}

interface UseDetectionReturn extends DetectionState {
  detect: (uuid: string, modelHint?: "manga" | "western") => Promise<void>;
  reset: () => void;
}

/**
 * useDetection: Hook for managing panel detection state.
 *
 * Handles API calls, loading state, error handling, and toast notifications.
 * Follows same pattern as useFileUpload from Phase 1.
 */
export function useDetection(): UseDetectionReturn {
  const [state, setState] = useState<DetectionState>({
    isDetecting: false,
    panels: null,
    contentType: null,
    error: null,
  });

  const detect = useCallback(
    async (uuid: string, modelHint?: "manga" | "western") => {
      setState((prev) => ({
        ...prev,
        isDetecting: true,
        error: null,
      }));

      try {
        const result = await detectPanels(uuid, modelHint);

        setState({
          isDetecting: false,
          panels: result.panels,
          contentType: result.content_type,
          error: null,
        });

        // Success toast with panel count
        const panelCount = result.panels.length;
        if (panelCount > 0) {
          toast.success("Panels detected", {
            description: `Found ${panelCount} panel${panelCount === 1 ? "" : "s"} (${result.content_type})`,
          });
        } else {
          toast.info("No panels detected", {
            description: "This may be a non-comic image or detection failed",
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Detection failed";
        setState((prev) => ({
          ...prev,
          isDetecting: false,
          error: message,
        }));
        toast.error("Detection failed", {
          description: message,
        });
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({
      isDetecting: false,
      panels: null,
      contentType: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    detect,
    reset,
  };
}
