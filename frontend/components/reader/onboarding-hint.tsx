"use client";

import { useEffect } from "react";
import { tokens, type ReaderTheme } from "./tokens";

interface OnboardingHintProps {
  /** Theme */
  theme: ReaderTheme;
  /** Callback when dismissed */
  onDismiss: () => void;
}

/**
 * OnboardingHint — First-run overlay showing tap zones and keyboard shortcuts.
 * Dismisses on any click/tap, Escape, or Space.
 */
export function OnboardingHint({ theme, onDismiss }: OnboardingHintProps) {
  const t = tokens(theme);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        background: theme === "dark" ? "rgba(14,14,14,0.78)" : "rgba(242,239,231,0.85)",
        backdropFilter: "blur(6px)",
        cursor: "pointer",
        fontFamily: "'Geist Sans', system-ui, sans-serif",
      }}
    >
      {/* Left zone */}
      <div
        style={{
          flex: 1,
          borderRight: `1px dashed ${t.lineStrong}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <ChevronGlyph dir="left" color={t.ink} />
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: t.ink,
            letterSpacing: "-0.01em",
          }}
        >
          ← Back
        </div>
        <div
          style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 11,
            color: t.dim,
            letterSpacing: "0.08em",
          }}
        >
          TAP LEFT HALF
        </div>
      </div>

      {/* Right zone */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <ChevronGlyph dir="right" color={t.ink} />
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: t.ink,
            letterSpacing: "-0.01em",
          }}
        >
          Next →
        </div>
        <div
          style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 11,
            color: t.dim,
            letterSpacing: "0.08em",
          }}
        >
          TAP RIGHT HALF
        </div>
      </div>

      {/* Keyboard shortcut card */}
      <div
        style={{
          position: "absolute",
          bottom: "8%",
          left: "50%",
          transform: "translateX(-50%)",
          background: t.bg,
          border: `2px solid ${t.ink}`,
          boxShadow: `4px 4px 0 0 ${t.shadow}`,
          padding: "14px 18px",
          display: "flex",
          gap: 18,
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 10,
            color: t.dim,
            letterSpacing: "0.12em",
          }}
        >
          KEYBOARD
        </div>
        <KeyCap theme={theme}>←</KeyCap>
        <KeyCap theme={theme}>→</KeyCap>
        <KeyCap theme={theme}>SPC</KeyCap>
        <KeyCap theme={theme}>ESC</KeyCap>
      </div>

      {/* Dismiss hint */}
      <div
        style={{
          position: "absolute",
          top: 28,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Geist Mono', ui-monospace, monospace",
          fontSize: 11,
          color: t.dim,
          letterSpacing: "0.12em",
        }}
      >
        TAP ANYWHERE TO DISMISS
      </div>
    </div>
  );
}

function ChevronGlyph({ dir, color }: { dir: "left" | "right"; color: string }) {
  const points = dir === "left" ? "38,8 14,28 38,48" : "14,8 38,28 14,48";
  return (
    <svg viewBox="0 0 52 56" width="52" height="56" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function KeyCap({ children, theme }: { children: React.ReactNode; theme: ReaderTheme }) {
  const t = tokens(theme);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 32,
        height: 28,
        padding: "0 8px",
        border: `2px solid ${t.ink}`,
        boxShadow: `2px 2px 0 0 ${t.ink}`,
        background: t.bg,
        color: t.ink,
        fontFamily: "'Geist Mono', ui-monospace, monospace",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}
