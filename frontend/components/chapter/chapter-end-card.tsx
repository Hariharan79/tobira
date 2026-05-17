"use client";

import { tokens, zineButtonStyle, type ReaderTheme } from "@/components/reader";

interface ChapterEndCardProps {
  theme?: ReaderTheme;
  mobile?: boolean;
  /** Chapter display title */
  title: string;
  /** Total pages in the chapter */
  totalPages: number;
  /** Total panels across all pages */
  totalPanels: number;
  /** READ AGAIN — restarts the whole chapter at page 0 / panel 0 (D-05) */
  onAgain: () => void;
  /** CHAPTER OVERVIEW — secondary action */
  onBack: () => void;
}

/**
 * ChapterEndCard — appears ONCE, only after the very last panel of the last
 * page (D-05). Mirrors reader/end-card.tsx's onAgain/onBack prop shape.
 * Locked zine design.
 */
export function ChapterEndCard({
  theme = "dark",
  mobile = false,
  title,
  totalPages,
  totalPanels,
  onAgain,
  onBack,
}: ChapterEndCardProps) {
  const t = tokens(theme);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "6%",
        textAlign: "center",
        gap: mobile ? 16 : 24,
        fontFamily: "'Geist Sans', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          fontFamily: "'Geist Mono', ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: "0.16em",
          color: t.dim,
        }}
      >
        END OF CHAPTER
      </div>
      <div
        style={{
          fontSize: mobile ? 88 : 168,
          fontWeight: 700,
          letterSpacing: "-0.06em",
          lineHeight: 0.85,
          color: t.ink,
        }}
      >
        終
      </div>
      <div
        style={{
          fontSize: mobile ? 18 : 22,
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "'Geist Mono', ui-monospace, monospace",
          fontSize: 12,
          letterSpacing: "0.16em",
          color: t.dim,
        }}
      >
        {totalPages} PAGES · {totalPanels} PANELS
      </div>

      <HalftoneBand
        theme={theme}
        opacity={0.45}
        style={{ width: "60%", marginTop: 4, marginBottom: 4 }}
      />

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          onClick={onAgain}
          style={{
            ...zineButtonStyle(t, true),
            padding: "14px 22px",
            fontSize: 14,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <RotateIcon /> READ AGAIN
        </button>
        <button
          type="button"
          onClick={onBack}
          style={{
            ...zineButtonStyle(t),
            padding: "14px 22px",
            fontSize: 14,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <GridIcon /> CHAPTER OVERVIEW
        </button>
      </div>
    </div>
  );
}

function HalftoneBand({
  theme,
  opacity = 1,
  style = {},
}: {
  theme: ReaderTheme;
  opacity?: number;
  style?: React.CSSProperties;
}) {
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
        ...style,
      }}
    />
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
