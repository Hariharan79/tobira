"use client";

import { tokens, zineButtonStyle, type ReaderTheme } from "@/components/reader";

interface ResumeBannerProps {
  theme?: ReaderTheme;
  /** Page number to display (1-based) */
  pageN: number;
  /** Panel number to display (1-based) */
  panelN: number;
  /** RESUME → — open the reader at the saved position (Rule 4 commit) */
  onResume: () => void;
  /** START OVER — strip the hash, stay on landing */
  onDismiss: () => void;
}

/**
 * ResumeBanner — the deep-link guard surface (D-17). Rendered on the landing
 * page when arriving with a stale #page=N&panel=M hash under guard Rule 2
 * (reload / internal nav). We do NOT auto-open the reader on reload.
 * Locked zine design.
 */
export function ResumeBanner({
  theme = "light",
  pageN,
  panelN,
  onResume,
  onDismiss,
}: ResumeBannerProps) {
  const t = tokens(theme);

  return (
    <div
      style={{
        width: "100%",
        background: t.bg,
        color: t.ink,
        border: `2px solid ${t.ink}`,
        boxShadow: `4px 4px 0 0 ${t.shadow}`,
        fontFamily: "'Geist Sans', system-ui, sans-serif",
      }}
    >
      <HalftoneBand theme={theme} opacity={0.7} />
      <div
        style={{
          padding: "16px 18px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Geist Mono', ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: "0.16em",
              color: t.accent,
            }}
          >
            RESUME?
          </div>
          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600 }}>
            You left off at PG{" "}
            <span style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}>
              {String(pageN).padStart(2, "0")}
            </span>{" "}
            · PANEL{" "}
            <span style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}>
              {String(panelN).padStart(2, "0")}
            </span>
            .
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 12,
              color: t.dim,
              lineHeight: 1.5,
            }}
          >
            We don&apos;t auto-open the reader on reload — open it yourself with the buttons here.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              ...zineButtonStyle(t),
              padding: "10px 14px",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            START OVER
          </button>
          <button
            type="button"
            onClick={onResume}
            style={{
              ...zineButtonStyle(t, true),
              padding: "10px 14px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            RESUME →
          </button>
        </div>
      </div>
    </div>
  );
}

function HalftoneBand({ theme, opacity = 1 }: { theme: ReaderTheme; opacity?: number }) {
  const dot = theme === "dark" ? "#F2EFE7" : "#0E0E0E";
  return (
    <div
      aria-hidden="true"
      style={{
        height: 14,
        width: "100%",
        backgroundImage: `radial-gradient(${dot} 1.2px, transparent 1.4px)`,
        backgroundSize: "8px 8px",
        backgroundPosition: "0 0",
        opacity,
      }}
    />
  );
}
