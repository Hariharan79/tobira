"use client";

import { tokens, zineButtonStyle, type ReaderTheme } from "./tokens";
import type { ReaderPage } from "./types";

interface EndCardProps {
  /** Theme */
  theme: ReaderTheme;
  /** Page data for title */
  page: ReaderPage;
  /** Callback for "Read again" */
  onAgain: () => void;
  /** Callback for "Back to overview" */
  onBack: () => void;
}

/**
 * EndCard — Shown after the last panel.
 * Offers "Read again" and "Back to overview" actions.
 */
export function EndCard({ theme, page, onAgain, onBack }: EndCardProps) {
  const t = tokens(theme);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6%",
        fontFamily: "'Geist Sans', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: "0.24em",
            color: t.dim,
          }}
        >
          END OF PAGE
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: t.ink,
            lineHeight: 0.9,
          }}
        >
          そして
          <br />— 続く
        </div>
        <div
          style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 13,
            color: t.ink,
            letterSpacing: "0.04em",
          }}
        >
          {page.title}
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
          <button
            type="button"
            onClick={onAgain}
            style={{
              ...zineButtonStyle(t, true),
              padding: "14px 22px",
              fontSize: 15,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <RotateIcon /> Read again
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{
              ...zineButtonStyle(t),
              padding: "14px 22px",
              fontSize: 15,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <GridIcon /> Back to overview
          </button>
        </div>
      </div>
    </div>
  );
}

function RotateIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <polyline points="3 3 3 8 8 8" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
