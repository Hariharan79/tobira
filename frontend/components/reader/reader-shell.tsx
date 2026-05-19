"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { tokens, zineButtonStyle, type ReaderTheme } from "./tokens";
import { ProgressTrack } from "./progress-track";
import { MiniMap } from "./mini-map";
import { OnboardingHint } from "./onboarding-hint";
import { EndCard } from "./end-card";
import { PanelCrop } from "./panel-crop";
import type { ReaderPage } from "./types";

interface ReaderShellProps {
  page: ReaderPage;
  startAt?: number;
  theme?: ReaderTheme;
  mobile?: boolean;
  onClose?: () => void;
  onPanelChange?: (index: number) => void;
  showOnboarding?: boolean;
}

/* ── Feel tuning ────────────────────────────────────────────────
 * These constants are the entire "satisfying" feel. A flick must
 * cross COMMIT_DISTANCE_FRAC of the screen (or COMMIT_VELOCITY) to
 * advance — otherwise it springs back, which IS the resistance
 * feedback. One wheel/trackpad burst = exactly one panel (cooldown
 * prevents blow-past). The settle uses an expo-out curve with a
 * tiny overshoot pop on the landing panel + a haptic tick.        */
const SETTLE_MS = 460;
const SETTLE_EASE = "cubic-bezier(0.16, 1, 0.3, 1)"; // easeOutExpo
const COMMIT_DISTANCE_FRAC = 0.16; // fraction of viewport height
const COMMIT_VELOCITY = 0.45; // px / ms
const WHEEL_THRESHOLD = 48; // accumulated deltaY to commit
const WHEEL_COOLDOWN_MS = 520; // lock after a wheel commit
const RUBBER = 0.32; // overscroll damping at the ends
const HAPTIC_MS = 9;

export function ReaderShell({
  page,
  startAt = 0,
  theme = "dark",
  mobile = false,
  onClose,
  onPanelChange,
  showOnboarding = false,
}: ReaderShellProps) {
  const t = tokens(theme);
  const total = page.panels.length;
  const END_INDEX = total; // trailing End card section
  const MAX_INDEX = END_INDEX;

  const containerRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(startAt);
  const [offset, setOffset] = useState(0); // live drag px
  // `dragging` state drives the render (transition off / pop disabled) but
  // MUST NOT gate the touch logic: it's set async in onTouchStart, so the
  // first touchmove events of a fresh gesture fire before React commits it
  // and were being dropped — "not responsive the first time, works on
  // retry". `dragRef` is the synchronous truth the handlers gate on.
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(false);
  const [onboarding, setOnboarding] = useState(showOnboarding);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [viewH, setViewH] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [settleKey, setSettleKey] = useState(0); // retriggers landing pop

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locked = useRef(false); // mid-transition / cooldown lock
  const wheelAccum = useRef(0);
  const wheelIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touch = useRef({ y0: 0, t0: 0, lastY: 0, lastT: 0 });

  // prefers-reduced-motion
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(m.matches);
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, []);

  // Preload page → true pixel dims for distortion-free crop
  useEffect(() => {
    let cancelled = false;
    const im = new window.Image();
    im.onload = () => {
      if (!cancelled) setDims({ w: im.naturalWidth, h: im.naturalHeight });
    };
    im.src = page.imageUrl;
    return () => {
      cancelled = true;
    };
  }, [page.imageUrl]);

  // Track viewport height (transform uses px so resize stays exact)
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (el) setViewH(el.clientHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [dims]);

  // Chrome auto-hide
  const bumpChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChromeVisible(false), 2200);
  }, []);
  useEffect(() => {
    bumpChrome();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (animTimer.current) clearTimeout(animTimer.current);
      if (wheelIdle.current) clearTimeout(wheelIdle.current);
    };
  }, [bumpChrome]);

  // URL hash / parent sync
  useEffect(() => {
    if (idx >= 0 && idx < total) onPanelChange?.(idx);
  }, [idx, total, onPanelChange]);

  const haptic = useCallback(() => {
    if (reduced) return;
    try {
      navigator.vibrate?.(HAPTIC_MS);
    } catch {
      /* not supported — silent */
    }
  }, [reduced]);

  // Commit to a target index with the spring settle.
  const goTo = useCallback(
    (target: number, withHaptic = true) => {
      const clamped = Math.max(0, Math.min(MAX_INDEX, target));
      const changed = clamped !== idx;
      dragRef.current = false;
      setDragging(false);
      setOffset(0);
      setIdx(clamped);
      if (changed) {
        setSettleKey((k) => k + 1);
        if (withHaptic) haptic();
        bumpChrome();
      }
      // lock for the duration of the settle so input can't stack
      locked.current = true;
      if (animTimer.current) clearTimeout(animTimer.current);
      animTimer.current = setTimeout(
        () => {
          locked.current = false;
        },
        reduced ? 60 : SETTLE_MS
      );
    },
    [idx, MAX_INDEX, haptic, bumpChrome, reduced]
  );

  const step = useCallback(
    (dir: 1 | -1) => {
      if (onboarding) {
        setOnboarding(false);
        return;
      }
      goTo(idx + dir);
    },
    [idx, onboarding, goTo]
  );

  // ── Wheel / trackpad: one burst = one panel (the desktop resistance) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (onboarding) {
        setOnboarding(false);
        return;
      }
      if (locked.current) return;
      wheelAccum.current += e.deltaY;
      if (wheelIdle.current) clearTimeout(wheelIdle.current);
      wheelIdle.current = setTimeout(() => {
        wheelAccum.current = 0;
      }, 140);

      if (Math.abs(wheelAccum.current) >= WHEEL_THRESHOLD) {
        const dir = wheelAccum.current > 0 ? 1 : -1;
        wheelAccum.current = 0;
        step(dir as 1 | -1);
        // hard cooldown so a long trackpad flick can't skip panels
        locked.current = true;
        if (animTimer.current) clearTimeout(animTimer.current);
        animTimer.current = setTimeout(
          () => {
            locked.current = false;
          },
          reduced ? 80 : WHEEL_COOLDOWN_MS
        );
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onboarding, step, reduced]);

  // ── Touch: drag with resistance + flick-to-commit + rubber-band ──
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Do NOT bail on locked.current here. `locked` is held for SETTLE_MS
      // (460ms) after every commit to keep wheel/trackpad bursts from
      // stacking — but gating touchstart on it made the feed ignore any
      // new swipe during the settle, so rapid TikTok-style flicks were
      // silently dropped. Touch must be able to interrupt the settle
      // (goTo clamps + re-arms the timer, so re-committing mid-animation
      // is safe). Wheel still respects `locked` via its own handler.
      if (onboarding) return;
      const y = e.touches[0].clientY;
      touch.current = { y0: y, t0: performance.now(), lastY: y, lastT: performance.now() };
      dragRef.current = true; // synchronous — first touchmove is honored
      setDragging(true); // async — render only (transition/pop)
      bumpChrome();
    },
    [onboarding, bumpChrome]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragRef.current) return;
      const y = e.touches[0].clientY;
      let d = y - touch.current.y0;
      // Rubber-band when pulling past the first / last section
      const atTopEdge = idx <= 0 && d > 0;
      const atBotEdge = idx >= MAX_INDEX && d < 0;
      if (atTopEdge || atBotEdge) d *= RUBBER;
      setOffset(d);
      touch.current.lastY = y;
      touch.current.lastT = performance.now();
    },
    [idx, MAX_INDEX]
  );

  const onTouchEnd = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = false;
    const dist = offset;
    const dt = Math.max(1, performance.now() - touch.current.lastT + 16);
    const vel =
      (touch.current.lastY - touch.current.y0) / Math.max(1, performance.now() - touch.current.t0);
    const threshold = viewH * COMMIT_DISTANCE_FRAC;
    const passed = Math.abs(dist) > threshold || Math.abs(vel) > COMMIT_VELOCITY;
    void dt;
    if (passed) {
      step(dist < 0 ? 1 : -1);
    } else {
      // spring back to current — this is the resistance feedback
      setDragging(false);
      setOffset(0);
      if (Math.abs(dist) > 6) haptic();
    }
  }, [offset, viewH, step, haptic]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (onboarding) return;
      if (["ArrowDown", "ArrowRight", "PageDown", " ", "d", "D", "j"].includes(e.key)) {
        e.preventDefault();
        step(1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp", "a", "A", "k"].includes(e.key)) {
        e.preventDefault();
        step(-1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onClose, onboarding]);

  const safeIdx = Math.max(0, Math.min(total - 1, idx));
  const atEnd = idx >= END_INDEX;

  const trackY = -idx * viewH + offset;

  return (
    <div
      ref={containerRef}
      onMouseMove={bumpChrome}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
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
      {/* Transform-driven vertical stack */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          willChange: "transform",
          transform: `translate3d(0, ${trackY}px, 0)`,
          transition: dragging ? "none" : `transform ${reduced ? 120 : SETTLE_MS}ms ${SETTLE_EASE}`,
        }}
      >
        {!dims && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Geist Mono', ui-monospace, monospace",
              fontSize: 12,
              letterSpacing: "0.18em",
              color: t.dim,
            }}
          >
            LOADING…
          </div>
        )}

        {dims &&
          page.panels.map((panel, i) => {
            const settled = i === idx; // navigation identity — NOT touch-affected
            const isActive = settled && !dragging; // drives the pop ANIMATION only
            return (
              <section
                key={panel.n}
                style={{
                  position: "absolute",
                  top: i * viewH,
                  left: 0,
                  width: "100%",
                  height: viewH || "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  // Key MUST NOT depend on `dragging`. Touch sets dragging,
                  // which would flip this key and remount the node under the
                  // finger → Safari fires touchcancel and restarts the touch
                  // (the double-`touchstart` seen in device probing) → the
                  // first swipe is silently dropped. Key only on settle/nav.
                  key={settled ? `pop-${settleKey}` : `idle-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation:
                      isActive && !reduced
                        ? `readerSettle ${SETTLE_MS}ms ${SETTLE_EASE} both`
                        : "none",
                  }}
                >
                  <PanelCrop
                    panel={panel}
                    imageUrl={page.imageUrl}
                    pageWidth={dims.w}
                    pageHeight={dims.h}
                    theme={theme}
                  />
                </div>
              </section>
            );
          })}

        {dims && (
          <section
            style={{
              position: "absolute",
              top: END_INDEX * viewH,
              left: 0,
              width: "100%",
              height: viewH || "100%",
            }}
          >
            <EndCard
              theme={theme}
              page={page}
              onAgain={() => goTo(0, false)}
              onBack={() => onClose?.()}
            />
          </section>
        )}
      </div>

      {/* Landing-pop keyframes */}
      <style jsx global>{`
        @keyframes readerSettle {
          0% {
            transform: translateY(10px) scale(0.984);
            opacity: 0.82;
          }
          60% {
            transform: translateY(-2px) scale(1.003);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* Chrome — top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          opacity: chromeVisible || onboarding ? 1 : 0,
          transform: chromeVisible || onboarding ? "translateY(0)" : "translateY(-6px)",
          transition: "opacity 220ms, transform 220ms",
          pointerEvents: chromeVisible || onboarding ? "auto" : "none",
        }}
      >
        <ProgressTrack total={total} current={safeIdx} theme={theme} onSeek={(i) => goTo(i)} />
        <div
          style={{
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
            <span style={{ color: t.ink, fontWeight: 600 }}>TOBIRA</span>
            <span style={{ margin: "0 10px", opacity: 0.5 }}>·</span>
            <span>{atEnd ? "END" : `${safeIdx + 1} / ${total}`}</span>
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
      </div>

      {/* Chrome — bottom-left minimap */}
      <div
        style={{
          position: "absolute",
          left: 22,
          bottom: 22,
          zIndex: 20,
          opacity: chromeVisible ? 1 : 0,
          transform: chromeVisible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 220ms, transform 220ms",
          pointerEvents: chromeVisible ? "auto" : "none",
        }}
      >
        <MiniMap
          page={page}
          current={safeIdx}
          theme={theme}
          compact={mobile}
          onSeek={(i) => goTo(i)}
        />
      </div>

      {/* Chrome — bottom-right nav */}
      <div
        style={{
          position: "absolute",
          right: 22,
          bottom: 22,
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
          disabled={idx <= 0}
          aria-label="Previous panel"
          style={{
            ...zineButtonStyle(t),
            opacity: idx <= 0 ? 0.35 : 1,
            cursor: idx <= 0 ? "not-allowed" : "pointer",
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

      {onboarding && <OnboardingHint theme={theme} onDismiss={() => setOnboarding(false)} />}
    </div>
  );
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
