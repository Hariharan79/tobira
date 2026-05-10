"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { detectPanels } from "@/lib/api";
import type { Panel, ReadingDirection } from "@/lib/types";

interface DetectionState {
  isDetecting: boolean;
  panels: Panel[] | null;
  contentType: "manga" | "western" | "unknown" | null;
  direction: ReadingDirection | null;
  ambiguous: boolean;
  error: string | null;
}

interface DetectionOptions {
  modelHint?: "manga" | "western";
  direction?: ReadingDirection;
}

interface UseDetectionReturn extends DetectionState {
  detect: (uuid: string, options?: DetectionOptions) => Promise<void>;
  reset: () => void;
}

/**
 * useDetection: Hook for managing panel detection state.
 *
 * Handles API calls, loading state, error handling, and toast notifications.
 * Follows same pattern as useFileUpload from Phase 1.
 * Extended in Phase 3 to support direction parameter per D-05.
 */
export function useDetection(): UseDetectionReturn {
  const [state, setState] = useState<DetectionState>({
    isDetecting: false,
    panels: null,
    contentType: null,
    direction: null,
    ambiguous: false,
    error: null,
  });

  const detect = useCallback(
    async (uuid: string, options?: DetectionOptions) => {
      setState((prev) => ({
        ...prev,
        isDetecting: true,
        error: null,
      }));

      try {
        const result = await detectPanels(uuid, options);

        setState({
          isDetecting: false,
          panels: result.panels,
          contentType: result.content_type,
          direction: result.direction,
          ambiguous: result.ambiguous,
          error: null,
        });

        // Success toast with panel count
        const panelCount = result.panels.length;
        if (panelCount > 0) {
          toast.success("Panels detected", {
            description: `Found ${panelCount} panel${panelCount === 1 ? "" : "s"} (${result.content_type}, ${result.direction.toUpperCase()})`,
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
      direction: null,
      ambiguous: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    detect,
    reset,
  };
}
