"use client";

import { tokens, type ReaderTheme } from "@/components/reader";

interface MultiPageProgressProps {
  /** Total pages in the chapter */
  totalPages: number;
  /** Current page index (0-based) */
  currentPage: number;
  /** Panel count of the current page */
  panelsOnPage: number;
  /** Current panel index within the current page (0-based) */
  currentPanel: number;
  theme: ReaderTheme;
  onSeekPage?: (index: number) => void;
  onSeekPanel?: (index: number) => void;
}

/**
 * MultiPageProgress — two-tier segmented bar for the chapter reader.
 * Tier 1: chapter page position (height 4, gap 3).
 * Tier 2: current-page panel position (height 2, gap 4, opacity 0.85).
 * Extends the single-tier progress-track.tsx idiom. now=accent,
 * past=lineStrong, future=line.
 */
export function MultiPageProgress({
  totalPages,
  currentPage,
  panelsOnPage,
  currentPanel,
  theme,
  onSeekPage,
  onSeekPanel,
}: MultiPageProgressProps) {
  const t = tokens(theme);

  return (
    <div style={{ width: "100%", padding: "12px 18px 0" }}>
      {/* page tier */}
      <div style={{ display: "flex", gap: 3, width: "100%" }}>
        {Array.from({ length: totalPages }).map((_, i) => {
          const s = i < currentPage ? "past" : i === currentPage ? "now" : "future";
          const bg = s === "now" ? t.accent : s === "past" ? t.lineStrong : t.line;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSeekPage?.(i)}
              aria-label={`Go to page ${i + 1}`}
              style={{
                flex: 1,
                height: 4,
                minWidth: 0,
                background: bg,
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "background 80ms",
              }}
            />
          );
        })}
      </div>
      {/* panel tier */}
      <div style={{ display: "flex", gap: 4, width: "100%", marginTop: 4 }}>
        {Array.from({ length: panelsOnPage }).map((_, i) => {
          const s = i < currentPanel ? "past" : i === currentPanel ? "now" : "future";
          const bg = s === "now" ? t.accent : s === "past" ? t.lineStrong : t.line;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSeekPanel?.(i)}
              aria-label={`Go to panel ${i + 1}`}
              style={{
                flex: 1,
                height: 2,
                minWidth: 0,
                background: bg,
                border: "none",
                padding: 0,
                cursor: "pointer",
                opacity: 0.85,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
