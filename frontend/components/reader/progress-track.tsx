"use client";

import { tokens, type ReaderTheme } from "./tokens";

interface ProgressTrackProps {
  /** Total number of panels */
  total: number;
  /** Current panel index (0-based) */
  current: number;
  /** Theme */
  theme: ReaderTheme;
  /** Callback when segment clicked */
  onSeek?: (index: number) => void;
}

/**
 * ProgressTrack — Instagram Stories-style segmented progress bar.
 * Shows past/current/future state for each panel.
 */
export function ProgressTrack({ total, current, theme, onSeek }: ProgressTrackProps) {
  const t = tokens(theme);

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        width: "100%",
        padding: "14px 18px 0",
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const state = i < current ? "past" : i === current ? "now" : "future";
        const bg = state === "now" ? t.accent : state === "past" ? t.lineStrong : t.line;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSeek?.(i)}
            aria-label={`Go to panel ${i + 1}`}
            style={{
              flex: 1,
              height: 3,
              minWidth: 0,
              background: bg,
              border: "none",
              padding: 0,
              cursor: "pointer",
              transition: "background 160ms",
            }}
          />
        );
      })}
    </div>
  );
}
