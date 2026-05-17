"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getChapterEventsUrl, getChapterStatus } from "@/lib/api";
import type { PageStatusValue } from "@/lib/types";

interface ChapterDetectionState {
  pageCount: number;
  /** page index (0-based) → status; pages not yet reported are "queued" */
  pages: Record<number, PageStatusValue>;
  doneCount: number;
  /** flips true the instant page 0 is "done" — gates START READING (D-07/D-08) */
  page1Ready: boolean;
  allDone: boolean;
  error: string | null;
}

interface UseChapterDetectionReturn extends ChapterDetectionState {
  reset: () => void;
}

// Switch SSE → polling after this many consecutive EventSource errors.
const SSE_ERROR_LIMIT = 3;
const POLL_INTERVAL_MS = 2000;

function emptyState(pageCount: number): ChapterDetectionState {
  return {
    pageCount,
    pages: {},
    doneCount: 0,
    page1Ready: false,
    allDone: false,
    error: null,
  };
}

function mergePage(
  prev: ChapterDetectionState,
  page: number,
  status: PageStatusValue
): ChapterDetectionState {
  const pages = { ...prev.pages, [page]: status };
  const doneCount = Object.values(pages).filter((s) => s === "done").length;
  return {
    ...prev,
    pages,
    doneCount,
    page1Ready: prev.page1Ready || pages[0] === "done",
    allDone: prev.pageCount > 0 && doneCount >= prev.pageCount,
  };
}

/**
 * useChapterDetection: consumes the eager per-page detection stream.
 *
 * Opens a native EventSource to /api/chapter/{uuid}/events; on repeated
 * EventSource errors it falls back to polling /status (RESEARCH Pitfall 5).
 * Mirrors the use-detection.ts state-machine/reset/toast discipline (D-03).
 */
export function useChapterDetection(
  comicUuid: string | null,
  pageCount: number
): UseChapterDetectionReturn {
  const [state, setState] = useState<ChapterDetectionState>(() => emptyState(pageCount));

  const reset = useCallback(() => {
    setState(emptyState(pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!comicUuid) return;

    setState(emptyState(pageCount));

    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let errorCount = 0;
    let closed = false;

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const startPolling = () => {
      if (pollTimer || closed) return;
      const tick = async () => {
        try {
          const data = await getChapterStatus(comicUuid);
          setState((prev) => {
            let next = prev;
            for (const p of data.pages) {
              next = mergePage(next, p.page, p.status);
            }
            return next;
          });
          if (data.page1_ready) {
            setState((prev) => ({ ...prev, page1Ready: true }));
          }
        } catch {
          // Stale/expired chapter (ephemeral FS, D-10) — surface once,
          // no console error (D-15). page.tsx (Plan 06) clears the key.
          setState((prev) =>
            prev.error ? prev : { ...prev, error: "This chapter has expired — re-upload." }
          );
          stopPolling();
        }
      };
      void tick();
      pollTimer = setInterval(tick, POLL_INTERVAL_MS);
    };

    const openStream = () => {
      es = new EventSource(getChapterEventsUrl(comicUuid));

      es.onmessage = (ev: MessageEvent) => {
        errorCount = 0;
        try {
          const payload = JSON.parse(ev.data) as {
            page?: number;
            status?: PageStatusValue;
            done?: boolean;
          };
          if (payload.done) {
            setState((prev) => ({ ...prev, allDone: true }));
            es?.close();
            return;
          }
          if (typeof payload.page === "number" && typeof payload.status === "string") {
            setState((prev) => mergePage(prev, payload.page!, payload.status!));
          }
        } catch {
          // Ignore malformed frame; the next valid one corrects state.
        }
      };

      es.onerror = () => {
        errorCount += 1;
        if (errorCount >= SSE_ERROR_LIMIT) {
          es?.close();
          startPolling();
        }
      };
    };

    openStream();

    return () => {
      closed = true;
      es?.close();
      stopPolling();
    };
  }, [comicUuid, pageCount]);

  useEffect(() => {
    if (state.error) {
      toast.error("Chapter unavailable", { description: state.error });
    }
  }, [state.error]);

  return { ...state, reset };
}
