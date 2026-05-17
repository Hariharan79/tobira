"use client";

import { tokens, zineButtonStyle, type ReaderTheme } from "@/components/reader";
import type { PageStatusValue } from "@/lib/types";

interface PageProcessingProps {
  theme?: ReaderTheme;
  mobile?: boolean;
  /** Total pages in the chapter */
  pageCount: number;
  /** page index (0-based) → status (from useChapterDetection) */
  pages: Record<number, PageStatusValue>;
  /** Number of pages fully detected */
  doneCount: number;
  /** True the instant page 0 resolved — enables START READING (D-07/D-08) */
  page1Ready: boolean;
  /** True when every page is detected */
  allDone: boolean;
  /** Total panel count once known (for the all-done copy) */
  totalPanels?: number;
  onCancel: () => void;
  onStart: () => void;
}

/**
 * PageProcessing — determinate "{done}/{total} pages detected" screen with
 * a per-page PAGE MAP. Three variants: page-1-pending / page-1-ready /
 * all-done. Start enables the moment page 01 resolves (D-08). Locked zine
 * design; consumes useChapterDetection state.
 */
export function PageProcessing({
  theme = "light",
  mobile = false,
  pageCount,
  pages,
  doneCount,
  page1Ready,
  allDone,
  totalPanels,
  onCancel,
  onStart,
}: PageProcessingProps) {
  const t = tokens(theme);

  const variant: "page-1-pending" | "page-1-ready" | "all-done" = allDone
    ? "all-done"
    : page1Ready
      ? "page-1-ready"
      : "page-1-pending";

  const canStart = page1Ready;
  const inflight = Object.values(pages).filter((s) => s === "detecting").length;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: t.bg,
        color: t.ink,
        fontFamily: "'Geist Sans', system-ui, sans-serif",
        padding: mobile ? 20 : 40,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Label theme={theme}>TOBIRA · CHAPTER · PROCESSING</Label>

      <div
        style={{
          marginTop: mobile ? 18 : 36,
          display: "flex",
          alignItems: "baseline",
          gap: mobile ? 12 : 18,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: mobile ? 72 : 120,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 0.9,
            color: t.ink,
          }}
        >
          {String(doneCount).padStart(2, "0")}
          <span style={{ opacity: 0.3 }}>/{String(pageCount).padStart(2, "0")}</span>
        </div>
        <div
          style={{
            fontSize: mobile ? 14 : 18,
            fontWeight: 600,
            opacity: 0.7,
          }}
        >
          pages detected
        </div>
      </div>

      {/* sub-status */}
      <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.5, maxWidth: 560 }}>
        {variant === "page-1-pending" && (
          <>
            Detecting panels on page 01…{" "}
            <span style={{ opacity: 0.6 }}>
              You&apos;ll be able to start reading the moment page 01 is ready.
            </span>
          </>
        )}
        {variant === "page-1-ready" && (
          <>
            <strong>Page 01 is ready.</strong>{" "}
            <span style={{ opacity: 0.6 }}>
              You can start reading now — pages 05–{pageCount} will keep loading in the background.
            </span>
          </>
        )}
        {variant === "all-done" && (
          <>
            <strong>All {pageCount} pages detected.</strong>{" "}
            <span style={{ opacity: 0.6 }}>
              {totalPanels ?? pageCount * 7}-panel chapter ready.
            </span>
          </>
        )}
      </div>

      {/* page-grid progress */}
      <div style={{ marginTop: mobile ? 22 : 36 }}>
        <Label theme={theme} style={{ marginBottom: 8 }}>
          PAGE MAP
        </Label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${mobile ? 10 : 20}, 1fr)`,
            gap: 4,
          }}
        >
          {Array.from({ length: pageCount }).map((_, i) => {
            const st = pages[i];
            const tile: "done" | "loading" | "queued" =
              st === "done" ? "done" : st === "detecting" ? "loading" : "queued";
            return <PageTile key={i} n={i + 1} state={tile} theme={theme} />;
          })}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* halftone band + action row */}
      <HalftoneBand theme={theme} opacity={0.7} style={{ marginTop: 24 }} />
      <div
        style={{
          marginTop: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            color: t.dim,
          }}
        >
          {variant === "page-1-pending" && (
            <>
              <DotPulse theme={theme} /> WAITING · PAGE 01
            </>
          )}
          {variant === "page-1-ready" && (
            <>
              <DotPulse theme={theme} /> READING UNLOCKED · {inflight} PAGES PROCESSING
            </>
          )}
          {variant === "all-done" && (
            <>
              <Dot theme={theme} solid /> CHAPTER COMPLETE
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              ...zineButtonStyle(t),
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={!canStart}
            onClick={onStart}
            style={{
              ...zineButtonStyle(t, canStart),
              padding: "12px 22px",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.02em",
              opacity: canStart ? 1 : 0.4,
              cursor: canStart ? "pointer" : "not-allowed",
            }}
          >
            START READING →
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({
  theme,
  children,
  style,
}: {
  theme: ReaderTheme;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const t = tokens(theme);
  return (
    <div
      style={{
        fontFamily: "'Geist Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: "0.16em",
        color: t.dim,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function HalftoneBand({
  theme,
  height = 14,
  opacity = 1,
  style = {},
}: {
  theme: ReaderTheme;
  height?: number;
  opacity?: number;
  style?: React.CSSProperties;
}) {
  const dot = theme === "dark" ? "#F2EFE7" : "#0E0E0E";
  return (
    <div
      aria-hidden="true"
      style={{
        height,
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

function PageTile({
  n,
  state,
  theme,
}: {
  n: number;
  state: "done" | "loading" | "queued";
  theme: ReaderTheme;
}) {
  const t = tokens(theme);
  const bg = state === "done" ? t.ink : state === "loading" ? t.accent : "transparent";
  const color = state === "done" ? t.bg : state === "loading" ? t.accentInk : t.dim;
  return (
    <div
      style={{
        position: "relative",
        aspectRatio: "1 / 1.35",
        border: `1.5px solid ${state === "queued" ? t.line : t.ink}`,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Geist Mono', ui-monospace, monospace",
        fontSize: 9,
        fontWeight: 600,
        color,
        letterSpacing: "0.04em",
        transition: "background 80ms",
      }}
    >
      {String(n).padStart(2, "0")}
      {state === "loading" && (
        <span
          style={{
            position: "absolute",
            bottom: 3,
            right: 3,
            width: 4,
            height: 4,
            background: t.accentInk,
            animation: "panelIn 600ms ease infinite alternate",
          }}
        />
      )}
    </div>
  );
}

function Dot({ theme, solid }: { theme: ReaderTheme; solid?: boolean }) {
  const t = tokens(theme);
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        background: solid ? t.ink : t.accent,
        marginRight: 8,
        verticalAlign: "middle",
      }}
    />
  );
}

function DotPulse({ theme }: { theme: ReaderTheme }) {
  const t = tokens(theme);
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        background: t.accent,
        marginRight: 8,
        verticalAlign: "middle",
        animation: "pulse 900ms ease-in-out infinite alternate",
      }}
    />
  );
}
