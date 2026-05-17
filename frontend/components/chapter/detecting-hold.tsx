"use client";

import { tokens, type ReaderTheme } from "@/components/reader";

interface DetectingHoldProps {
  /** The page number being detected (1-based, for display) */
  detectingPage: number;
  theme?: ReaderTheme;
}

/**
 * DetectingHold — in-feed indeterminate hold shown when the reader reaches a
 * not-yet-detected page (D-09). This is a GRACEFUL auto-advancing hold, NOT a
 * hard scroll block — the auto-advance logic lives in ChapterReaderShell.
 * Locked zine design.
 */
export function DetectingHold({ detectingPage, theme = "dark" }: DetectingHoldProps) {
  const t = tokens(theme);
  const nn = String(detectingPage).padStart(2, "0");

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8%",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 720,
          aspectRatio: "4 / 3",
          border: `2px solid ${t.ink}`,
          boxShadow: `8px 8px 0 0 ${t.shadow}`,
          background: t.bg,
          overflow: "hidden",
        }}
      >
        {/* drifting halftone field */}
        <div
          style={{
            position: "absolute",
            inset: -20,
            backgroundImage: `radial-gradient(${t.ink} 1.4px, transparent 1.7px)`,
            backgroundSize: "10px 10px",
            opacity: 0.35,
            animation: "driftHalftone 6s linear infinite",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Geist Mono', ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: "0.16em",
              color: t.accent,
            }}
          >
            DETECTING
          </div>
          <div
            style={{
              fontFamily: "'Geist Mono', ui-monospace, monospace",
              fontSize: 96,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 0.9,
              color: t.ink,
            }}
          >
            PAGE {nn}
          </div>
          <div
            style={{
              fontSize: 13,
              color: t.dim,
              maxWidth: 360,
              lineHeight: 1.5,
            }}
          >
            You&apos;re ahead of the panel detector. We&apos;ll continue the moment page {nn}{" "}
            resolves — no action needed.
          </div>
          {/* indeterminate strip */}
          <div
            style={{
              marginTop: 8,
              position: "relative",
              width: 220,
              height: 3,
              background: t.line,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: 60,
                background: t.accent,
                animation: "shimmer 1.4s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
