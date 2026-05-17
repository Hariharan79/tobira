"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createReaderPage,
  MiniMap,
  PanelCrop,
  tokens,
  zineButtonStyle,
  type ReaderPage,
  type ReaderPanel,
  type ReaderTheme,
} from "@/components/reader";
import { ChapterEndCard } from "@/components/chapter/chapter-end-card";
import { DetectingHold } from "@/components/chapter/detecting-hold";
import { MultiPageProgress } from "@/components/chapter/multi-page-progress";
import {
  commitPosition,
  getPositionFromHash,
  setPositionHash,
} from "@/lib/hooks/use-deep-link-guard";
import type { Panel } from "@/lib/types";

/* ── Section model (RESEARCH §Pattern 3, Plan 05 contract) ──────────
 * ONE flat list spanning all pages. The page boundary is just "the next
 * section happens to belong to the next page" — no interstitial (D-04).
 * One ChapterEndCard after the final section (D-05). A not-yet-detected
 * page is a single "detecting" section that resolves in place (D-09).   */

export type ChapterSection =
  | { kind: "panel"; pageIndex: number; pageUrl: string; panel: ReaderPanel }
  | { kind: "detecting"; pageIndex: number }
  | { kind: "end" };

/** Accepts backend `Panel` (`{id,bbox,confidence}`) or reader-space panels. */
export interface ChapterReaderPanelInput {
  id?: number;
  n?: number;
  bbox: readonly number[];
  confidence: number;
}

export interface ChapterReaderPageInput {
  pageIndex: number;
  pageUrl: string;
  /** null/undefined → page not yet detected → a single "detecting" section */
  panels: ChapterReaderPanelInput[] | null;
}

function toChapterPanel(p: ChapterReaderPanelInput): ReaderPanel {
  return {
    n: p.id ?? p.n ?? 0,
    x: p.bbox[0] ?? 0,
    y: p.bbox[1] ?? 0,
    w: p.bbox[2] ?? 0,
    h: p.bbox[3] ?? 0,
    confidence: p.confidence,
  };
}

/**
 * Build the flat continuous section list. Last panel of page N is
 * immediately followed by the first panel of page N+1 (no interstitial,
 * D-04). Exactly ONE end section, always last (D-05).
 */
export function buildChapterSections(pages: ChapterReaderPageInput[]): ChapterSection[] {
  const sections: ChapterSection[] = [];
  for (const p of pages) {
    if (p.panels && p.panels.length > 0) {
      for (const raw of p.panels) {
        sections.push({
          kind: "panel",
          pageIndex: p.pageIndex,
          pageUrl: p.pageUrl,
          panel: toChapterPanel(raw),
        });
      }
    } else {
      sections.push({ kind: "detecting", pageIndex: p.pageIndex });
    }
  }
  sections.push({ kind: "end" });
  return sections;
}

interface ChapterReaderShellProps {
  pages: ChapterReaderPageInput[];
  /** Chapter display title (for the end card) */
  title?: string;
  /** Total pages of the chapter (for chrome + progress) */
  totalPages: number;
  theme?: ReaderTheme;
  mobile?: boolean;
  /** Deep-link entry point (0-based) */
  startPage?: number;
  startPanel?: number;
  onClose?: () => void;
  /** D-09 catch-up: ask the parent to fetch a not-yet-detected page */
  onRequestPage?: (pageIndex: number) => void;
}

/**
 * ChapterReaderShell — continuous cross-page feed that COMPOSES the LOCKED
 * Phase-4 reader pieces (PanelCrop / MiniMap / createReaderPage). It does
 * NOT modify reader-shell.tsx or fork its feel constants (RESEARCH
 * anti-pattern). Drives the #page=N&panel=M hash via use-deep-link-guard.
 */
export function ChapterReaderShell({
  pages,
  title = "Comic Chapter",
  totalPages,
  theme = "dark",
  mobile = false,
  startPage = 0,
  startPanel = 0,
  onClose,
  onRequestPage,
}: ChapterReaderShellProps) {
  const t = tokens(theme);

  const sections = useMemo(() => buildChapterSections(pages), [pages]);

  // Per-section metadata: page position + panel-within-page for chrome.
  const meta = useMemo(() => {
    const perPageCount: Record<number, number> = {};
    for (const s of sections) {
      if (s.kind === "panel") {
        perPageCount[s.pageIndex] = (perPageCount[s.pageIndex] ?? 0) + 1;
      }
    }
    const seen: Record<number, number> = {};
    return sections.map((s) => {
      if (s.kind === "panel") {
        const panelInPage = seen[s.pageIndex] ?? 0;
        seen[s.pageIndex] = panelInPage + 1;
        return {
          pageIndex: s.pageIndex,
          panelInPage,
          panelsInPage: perPageCount[s.pageIndex] ?? 1,
        };
      }
      if (s.kind === "detecting") {
        return { pageIndex: s.pageIndex, panelInPage: 0, panelsInPage: 1 };
      }
      return { pageIndex: totalPages - 1, panelInPage: 0, panelsInPage: 1 };
    });
  }, [sections, totalPages]);

  const MAX_INDEX = sections.length - 1;

  const startIdx = useMemo(() => {
    const fromHash = getPositionFromHash();
    const target = fromHash ?? { page: startPage, panel: startPanel };
    const hit = sections.findIndex(
      (s, i) =>
        s.kind === "panel" &&
        meta[i].pageIndex === target.page &&
        meta[i].panelInPage === target.panel
    );
    return hit >= 0 ? hit : 0;
  }, [sections, meta, startPage, startPanel]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(startIdx);
  const [viewH, setViewH] = useState(0);
  const [dims, setDims] = useState<Record<number, { w: number; h: number }>>({});
  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clampedIdx = Math.max(0, Math.min(MAX_INDEX, idx));
  const current = meta[clampedIdx];
  const currentSection = sections[clampedIdx];

  // Preload each page's true pixel dims for distortion-free PanelCrop
  // (mirrors reader-shell.tsx's new window.Image() effect, keyed per page).
  useEffect(() => {
    let cancelled = false;
    for (const p of pages) {
      if (dims[p.pageIndex] || !p.pageUrl) continue;
      const im = new window.Image();
      im.onload = () => {
        if (cancelled) return;
        setDims((prev) => ({
          ...prev,
          [p.pageIndex]: { w: im.naturalWidth, h: im.naturalHeight },
        }));
      };
      im.src = p.pageUrl;
    }
    return () => {
      cancelled = true;
    };
  }, [pages, dims]);

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (el) setViewH(el.clientHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const bumpChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChromeVisible(false), 2400);
  }, []);
  useEffect(() => {
    bumpChrome();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [bumpChrome]);

  // D-09: when sitting on a detecting section, ask the parent to fetch it;
  // when it resolves in place (pages prop updates → sections rebuild) the
  // feed auto-advances to that page's first panel — never a hard block.
  useEffect(() => {
    if (currentSection?.kind === "detecting") {
      onRequestPage?.(currentSection.pageIndex);
    }
  }, [currentSection, onRequestPage]);

  const prevSectionsLen = useRef(sections.length);
  useEffect(() => {
    if (currentSection?.kind !== "detecting" || sections.length === prevSectionsLen.current) {
      prevSectionsLen.current = sections.length;
      return;
    }
    const resolvedAt = sections.findIndex(
      (s, i) =>
        s.kind === "panel" &&
        meta[i].pageIndex === currentSection.pageIndex &&
        meta[i].panelInPage === 0
    );
    if (resolvedAt >= 0) setIdx(resolvedAt);
    prevSectionsLen.current = sections.length;
  }, [sections, meta, currentSection]);

  // Drive #page=N&panel=M on panel change (D-06) — reuse the guard's
  // replaceState primitive, do not re-implement scroll/snap.
  useEffect(() => {
    if (currentSection?.kind === "panel") {
      setPositionHash(current.pageIndex, current.panelInPage);
    }
  }, [currentSection, current]);

  const goTo = useCallback(
    (target: number) => {
      setIdx(Math.max(0, Math.min(MAX_INDEX, target)));
      bumpChrome();
    },
    [MAX_INDEX, bumpChrome]
  );
  const step = useCallback((dir: 1 | -1) => goTo(idx + dir), [idx, goTo]);

  // Wheel: one burst = one section.
  const wheelLock = useRef(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (wheelLock.current) return;
      if (Math.abs(e.deltaY) < 8) return;
      wheelLock.current = true;
      step(e.deltaY > 0 ? 1 : -1);
      setTimeout(() => {
        wheelLock.current = false;
      }, 380);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " ", "j"].includes(e.key)) {
        e.preventDefault();
        step(1);
      } else if (["ArrowUp", "PageUp", "k"].includes(e.key)) {
        e.preventDefault();
        step(-1);
      } else if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onClose]);

  const touch = useRef({ y0: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current.y0 = e.touches[0].clientY;
    bumpChrome();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touch.current.y0;
    if (Math.abs(dy) > 48) step(dy < 0 ? 1 : -1);
  };

  const restartChapter = useCallback(() => goTo(0), [goTo]);

  const trackY = -clampedIdx * viewH;
  const totalPanels = sections.filter((s) => s.kind === "panel").length;
  const atEnd = currentSection?.kind === "end";

  // Current page's ReaderPage for the MiniMap (composition, not rebuild).
  const currentReaderPage: ReaderPage | null = useMemo(() => {
    const p = pages.find((pg) => pg.pageIndex === current?.pageIndex);
    if (!p || !p.panels) return null;
    return createReaderPage(
      `page-${p.pageIndex}`,
      p.pageUrl,
      p.panels.map(
        (raw): Panel => ({
          id: raw.id ?? raw.n ?? 0,
          bbox: [raw.bbox[0] ?? 0, raw.bbox[1] ?? 0, raw.bbox[2] ?? 0, raw.bbox[3] ?? 0],
          confidence: raw.confidence,
        })
      ),
      title
    );
  }, [pages, current, title]);

  return (
    <div
      ref={containerRef}
      onMouseMove={bumpChrome}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: t.bg,
        color: t.ink,
        fontFamily: "'Geist Sans', system-ui, sans-serif",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          willChange: "transform",
          transform: `translate3d(0, ${trackY}px, 0)`,
          transition: "transform 360ms cubic-bezier(0.22,0.61,0.36,1)",
        }}
      >
        {sections.map((s, i) => (
          <section
            key={`${s.kind}-${i}`}
            style={{
              position: "absolute",
              top: i * viewH,
              left: 0,
              width: "100%",
              height: viewH || "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: s.kind === "panel" ? "4%" : 0,
              boxSizing: "border-box",
            }}
          >
            {s.kind === "panel" &&
              dims[s.pageIndex] &&
              (() => {
                const d = dims[s.pageIndex];
                return (
                  <PanelCrop
                    panel={s.panel}
                    imageUrl={s.pageUrl}
                    pageWidth={d.w}
                    pageHeight={d.h}
                    theme={theme}
                  />
                );
              })()}
            {s.kind === "detecting" && (
              <DetectingHold detectingPage={s.pageIndex + 1} theme={theme} />
            )}
            {s.kind === "end" && (
              <ChapterEndCard
                theme={theme}
                mobile={mobile}
                title={title}
                totalPages={totalPages}
                totalPanels={totalPanels}
                onAgain={restartChapter}
                onBack={() => onClose?.()}
              />
            )}
          </section>
        ))}
      </div>

      {/* pinned two-tier progress */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 25 }}>
        <MultiPageProgress
          totalPages={totalPages}
          currentPage={current?.pageIndex ?? 0}
          panelsOnPage={current?.panelsInPage ?? 1}
          currentPanel={current?.panelInPage ?? 0}
          theme={theme}
          onSeekPage={(pg) => {
            const hit = sections.findIndex(
              (sec, i) =>
                sec.kind === "panel" && meta[i].pageIndex === pg && meta[i].panelInPage === 0
            );
            if (hit >= 0) goTo(hit);
          }}
          onSeekPanel={(pn) => {
            const hit = sections.findIndex(
              (sec, i) =>
                sec.kind === "panel" &&
                meta[i].pageIndex === (current?.pageIndex ?? 0) &&
                meta[i].panelInPage === pn
            );
            if (hit >= 0) goTo(hit);
          }}
        />
      </div>

      {/* top chrome — readout + close */}
      <div
        style={{
          position: "absolute",
          top: 22,
          left: 0,
          right: 0,
          zIndex: 20,
          opacity: chromeVisible || atEnd ? 1 : 0,
          transition: "opacity 220ms",
          pointerEvents: chromeVisible || atEnd ? "auto" : "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px 0",
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
          <span style={{ color: t.ink, fontWeight: 700 }}>TOBIRA</span>
          <span style={{ margin: "0 10px", opacity: 0.5 }}>·</span>
          <span style={{ color: t.ink }}>
            PG {String((current?.pageIndex ?? 0) + 1).padStart(2, "0")}/
            {String(totalPages).padStart(2, "0")}
          </span>
          <span style={{ margin: "0 8px", opacity: 0.5 }}>·</span>
          <span>
            PANEL {String((current?.panelInPage ?? 0) + 1).padStart(2, "0")}/
            {String(current?.panelsInPage ?? 1).padStart(2, "0")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onClose?.()}
          aria-label="Close reader"
          style={{
            ...zineButtonStyle(t),
            width: 36,
            height: 36,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <XIcon />
        </button>
      </div>

      {/* bottom-left minimap — current page */}
      {currentSection?.kind === "panel" && currentReaderPage && (
        <div
          style={{
            position: "absolute",
            left: mobile ? 14 : 22,
            bottom: mobile ? 14 : 22,
            zIndex: 20,
            opacity: chromeVisible ? 1 : 0,
            transition: "opacity 220ms",
            pointerEvents: chromeVisible ? "auto" : "none",
          }}
        >
          <MiniMap
            page={currentReaderPage}
            current={current?.panelInPage ?? 0}
            theme={theme}
            compact={mobile}
          />
        </div>
      )}

      {/* bottom-right nav */}
      {!atEnd && (
        <div
          style={{
            position: "absolute",
            right: mobile ? 14 : 22,
            bottom: mobile ? 14 : 22,
            zIndex: 20,
            display: "flex",
            gap: 10,
            opacity: chromeVisible ? 1 : 0,
            transition: "opacity 220ms",
            pointerEvents: chromeVisible ? "auto" : "none",
          }}
        >
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={clampedIdx <= 0}
            aria-label="Previous panel"
            style={{
              ...zineButtonStyle(t),
              opacity: clampedIdx <= 0 ? 0.35 : 1,
              cursor: clampedIdx <= 0 ? "not-allowed" : "pointer",
              width: 44,
              height: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <ChevronIcon dir="up" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next panel"
            style={{
              ...zineButtonStyle(t, true),
              width: 44,
              height: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <ChevronIcon dir="down" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Resume entry helper for Plan 06: commit the deep-link position (Rule 4). */
export function resumeChapterAt(page: number, panel: number): void {
  commitPosition(page, panel);
}

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}

function ChevronIcon({ dir }: { dir: "up" | "down" }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <polyline
        points={dir === "up" ? "6,15 12,9 18,15" : "6,9 12,15 18,9"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
