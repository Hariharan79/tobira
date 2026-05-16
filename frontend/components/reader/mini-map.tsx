"use client";

import { useState, useEffect } from "react";
import { tokens, zineButtonStyle, type ReaderTheme } from "./tokens";
import type { ReaderPage } from "./types";

interface MiniMapProps {
  /** Page data with panels */
  page: ReaderPage;
  /** Current panel index (0-based) */
  current: number;
  /** Theme */
  theme: ReaderTheme;
  /** Compact mode for mobile — shows badge instead of full map */
  compact?: boolean;
  /** Callback when panel clicked to seek */
  onSeek?: (index: number) => void;
}

/**
 * MiniMap — Page thumbnail with current panel highlighted.
 * Collapses to a "03/12" badge on mobile; tap to expand.
 */
export function MiniMap({ page, current, theme, compact = false, onSeek }: MiniMapProps) {
  const t = tokens(theme);
  const [open, setOpen] = useState(!compact);

  useEffect(() => {
    setOpen(!compact);
  }, [compact]);

  const w = 108;
  const h = Math.round(w * 1.4);

  // Compact badge mode
  if (compact && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          ...zineButtonStyle(t),
          padding: "8px 12px",
          fontFamily: "'Geist Mono', ui-monospace, monospace",
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: "0.04em",
        }}
      >
        {String(current + 1).padStart(2, "0")} <span style={{ opacity: 0.5 }}>/</span>{" "}
        {String(page.panels.length).padStart(2, "0")}
      </button>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: w,
        background: t.bg,
        border: `2px solid ${t.ink}`,
        boxShadow: `4px 4px 0 0 ${t.shadow}`,
        padding: 6,
        fontFamily: "'Geist Mono', ui-monospace, monospace",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: h,
          background: theme === "dark" ? "#1A1A1A" : "#FFFFFF",
          overflow: "hidden",
        }}
      >
        {/* SVG panel preview */}
        <svg
          viewBox="0 0 100 140"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {page.panels.map((p) => {
            const isNow = p.n - 1 === current;
            const isPast = p.n - 1 < current;
            const fill = isNow
              ? t.accent
              : isPast
                ? theme === "dark"
                  ? "#3A3A3A"
                  : "#D6D2C8"
                : theme === "dark"
                  ? "#2A2A2A"
                  : "#E5E1D6";
            return (
              <g key={p.n} style={{ cursor: "pointer" }} onClick={() => onSeek?.(p.n - 1)}>
                <rect
                  x={p.x * 100 + 1}
                  y={p.y * 140 + 1}
                  width={p.w * 100 - 2}
                  height={p.h * 140 - 2}
                  fill={fill}
                />
                {isNow && (
                  <rect
                    x={p.x * 100 + 1}
                    y={p.y * 140 + 1}
                    width={p.w * 100 - 2}
                    height={p.h * 140 - 2}
                    fill="none"
                    stroke={t.ink}
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 6,
          fontSize: 10,
          letterSpacing: "0.08em",
          color: t.ink,
        }}
      >
        <span style={{ fontWeight: 600 }}>
          {String(current + 1).padStart(2, "0")}
          <span style={{ opacity: 0.4 }}>/</span>
          {String(page.panels.length).padStart(2, "0")}
        </span>
        <span style={{ opacity: 0.5 }}>P. 01</span>
      </div>
      {compact && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Collapse minimap"
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 18,
            height: 18,
            border: `1px solid ${t.ink}`,
            background: t.bg,
            color: t.ink,
            fontSize: 10,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
