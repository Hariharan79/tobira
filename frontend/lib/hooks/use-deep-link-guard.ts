"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Deep-link guard — extends the Phase-4 `#panel=N` scheme to
 * `#page=N&panel=M` (1-based in URL, 0-based internal — KEEP convention)
 * and folds in the deferred auto-open refinement (D-17).
 *
 * The four binding rules (05-UI-SPEC.md §"Deep-Link Guard Contract"):
 *   1. external / empty referrer + valid hash       → "auto-open"
 *   2. same-origin referrer OR reload OR consumed    → "show-resume"
 *   3. no chapter loaded OR hash past last page      → "strip"
 *   4. after Resume / Start-over                     → replaceState position
 *
 * `use-panel-hash.ts` (the single-image analog) is intentionally NOT touched.
 */

export type DeepLinkIntent = "auto-open" | "show-resume" | "strip";

const HASH_RE = /^#page=(\d+)&panel=(\d+)$/;
// Tab-scoped flag: once set, this tab has already "used" the deep link, so a
// subsequent reload follows Rule 2 (show-resume), not Rule 1 (auto-open).
const CONSUMED_KEY = "tobira-deeplink-consumed";

interface DeepLinkOpts {
  /** Total pages of the loaded chapter (omit/undefined → not range-checked) */
  pageCount?: number;
  /** Loaded chapter handle; `null` means "no chapter loaded" → strip */
  comicUuid?: string | null;
}

/** Parse `#page=N&panel=M` → 1-based URL pair, or null if it doesn't match. */
function parseHash(hash: string): { page: number; panel: number } | null {
  const m = hash.match(HASH_RE);
  if (!m) return null;
  const page = parseInt(m[1], 10);
  const panel = parseInt(m[2], 10);
  if (page <= 0 || panel <= 0) return null;
  return { page, panel };
}

function wasReload(): boolean {
  if (typeof performance === "undefined") return false;
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return nav?.type === "reload";
  } catch {
    return false;
  }
}

function intentConsumed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(CONSUMED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Pure resolver for the four binding rules. Caller passes chapter context
 * (Rule 3 is decided after the manifest loads).
 */
export function resolveDeepLinkIntent(hash: string, opts?: DeepLinkOpts): DeepLinkIntent {
  const parsed = parseHash(hash);

  // Rule 3 — content mismatch / no chapter → strip silently (no error).
  if (!parsed) return "strip";
  if (opts) {
    if (opts.comicUuid === null) return "strip";
    if (typeof opts.pageCount === "number" && parsed.page > opts.pageCount) {
      return "strip";
    }
  }

  // Rule 2 — reload / internal / already-consumed → show the ResumeBanner.
  if (wasReload() || intentConsumed()) return "show-resume";

  const referrer = typeof document !== "undefined" ? document.referrer : "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const sameOrigin = !!referrer && !!origin && referrer.startsWith(origin);
  if (sameOrigin) return "show-resume";

  // Rule 1 — empty / external referrer → open the reader at the deep link.
  return "auto-open";
}

/** Current position from the live hash, 0-based, or null. */
export function getPositionFromHash(): {
  page: number;
  panel: number;
} | null {
  if (typeof window === "undefined") return null;
  const parsed = parseHash(window.location.hash);
  if (!parsed) return null;
  return { page: parsed.page - 1, panel: parsed.panel - 1 };
}

/** Write the live position to the hash (0-based in → 1-based URL). */
export function setPositionHash(page: number, panel: number): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `#page=${page + 1}&panel=${panel + 1}`);
}

/**
 * Rule 4 — after a successful Resume / Start-over, replaceState the CURRENT
 * position and mark the deep link "consumed" so the NEXT reload follows
 * Rule 2 (show-resume), not Rule 1 (auto-open). `page`/`panel` are written
 * verbatim (URL-space).
 */
export function consumeDeepLinkIntent(pos: { page: number; panel: number }): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CONSUMED_KEY, "1");
  } catch {
    /* sessionStorage unavailable — degrade silently (D-15) */
  }
  window.history.replaceState(null, "", `#page=${pos.page}&panel=${pos.panel}`);
}

/** Plan-named alias: 0-based internal indices → consumed 1-based URL. */
export function commitPosition(page: number, panel: number): void {
  consumeDeepLinkIntent({ page: page + 1, panel: panel + 1 });
}

/** Strip the position hash silently (Rule 3 surface). */
export function stripPositionHash(): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", window.location.pathname);
}

interface UseDeepLinkGuardReturn {
  intent: DeepLinkIntent | null;
  position: { page: number; panel: number } | null;
  /** Call after Resume / Start-over to apply Rule 4. */
  commit: (page: number, panel: number) => void;
  /** Strip the hash (Rule 3) and clear local intent. */
  strip: () => void;
}

/**
 * React wrapper Plan 06 consumes to replace the aggressive auto-open effect
 * (frontend/app/page.tsx:138-145). Resolves the intent once on mount against
 * the loaded chapter context.
 */
export function useDeepLinkGuard(opts?: DeepLinkOpts): UseDeepLinkGuardReturn {
  const [intent, setIntent] = useState<DeepLinkIntent | null>(null);
  const [position, setPosition] = useState<{
    page: number;
    panel: number;
  } | null>(null);

  const pageCount = opts?.pageCount;
  const comicUuid = opts?.comicUuid;

  useEffect(() => {
    if (typeof window === "undefined") return;
    // pageCount/comicUuid drive Rule 3 once the manifest is known.
    const resolved = resolveDeepLinkIntent(window.location.hash, {
      pageCount,
      comicUuid,
    });
    setIntent(resolved);
    setPosition(resolved === "strip" ? null : getPositionFromHash());
  }, [pageCount, comicUuid]);

  const commit = useCallback((page: number, panel: number) => {
    commitPosition(page, panel);
    setIntent("auto-open");
    setPosition({ page, panel });
  }, []);

  const strip = useCallback(() => {
    stripPositionHash();
    setIntent("strip");
    setPosition(null);
  }, []);

  return { intent, position, commit, strip };
}
