"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { tokens, zineButtonStyle, type ReaderTheme } from "@/components/reader";
import { ResumeBanner } from "@/components/chapter/resume-banner";
import type { UploadResponse } from "@/lib/api";
import type { ChapterUploadResponse } from "@/lib/types";
import {
  DEMO_ATTRIBUTION,
  DEMO_COVER_URL,
  DEMO_PAGE_COUNT,
  DEMO_PANEL_COUNT,
  DEMO_TITLE,
} from "@/lib/demo";

// The interactive dropzone is a client island loaded lazily so the landing
// route ships minimal JS (Lighthouse — RESEARCH §Lighthouse Remediation).
// It pulls react-dropzone/sonner; keeping it dynamic keeps the hero fast.
const ChapterUploadEntry = dynamic(
  () => import("@/components/chapter/chapter-upload-entry").then((m) => m.ChapterUploadEntry),
  { ssr: false }
);

interface LandingProps {
  mobile?: boolean;
  onSingleSuccess: (data: UploadResponse) => void;
  onChapterSuccess: (data: ChapterUploadResponse) => void;
  /** Public demo deployment: curated chapter entry instead of upload UI. */
  demoMode?: boolean;
  onDemoStart?: () => void;
  showResume?: boolean;
  resumePageN?: number;
  resumePanelN?: number;
  onResume?: () => void;
  onResumeDismiss?: () => void;
}

/**
 * Landing — Tobira home / first-impression surface. Locked Claude Design
 * (hero, dual-mode upload, 3-step how-it-works, nav, footer). Semantic
 * h1/h2/h3, aria-labelledby per section, focus-visible — Lighthouse > 80
 * ×4 target (D-14). No reader bundle imported on this route.
 */
export function Landing({
  mobile = false,
  onSingleSuccess,
  onChapterSuccess,
  demoMode = false,
  onDemoStart,
  showResume = false,
  resumePageN = 1,
  resumePanelN = 1,
  onResume,
  onResumeDismiss,
}: LandingProps) {
  // Theme is driven by the shared next-themes provider (same system the
  // single-image SiteHeader toggle uses). Mounted-guard avoids a hydration
  // mismatch: server + first client render are deterministic ("light"),
  // then we sync to the resolved theme.
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const theme: ReaderTheme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const t = tokens(theme);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "auto",
        background: t.bg,
        color: t.ink,
        fontFamily: "'Geist Sans', system-ui, sans-serif",
      }}
    >
      <LandingNav theme={theme} mobile={mobile} isDark={isDark} onToggleTheme={toggleTheme} />

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: mobile ? "24px 18px 40px" : "36px 56px 60px",
        }}
      >
        {/* Hero */}
        <section aria-labelledby="hero-title" style={{ marginTop: mobile ? 12 : 24 }}>
          <SectionLabel theme={theme}>ISSUE 01 · OUT NOW · OPEN SOURCE</SectionLabel>
          <h1
            id="hero-title"
            style={{
              margin: "14px 0 0",
              fontSize: mobile ? 56 : 132,
              lineHeight: 0.9,
              fontWeight: 700,
              letterSpacing: "-0.05em",
              color: t.ink,
            }}
          >
            Read manga
            <br />
            <span style={{ color: t.accent }}>panel by panel.</span>
          </h1>
          <p
            style={{
              marginTop: 18,
              fontSize: mobile ? 16 : 19,
              maxWidth: 640,
              lineHeight: 1.45,
              color: t.ink,
              opacity: 0.78,
            }}
          >
            Tobira detects the panels in any comic page and plays them as a TikTok-style vertical
            feed — so each beat lands the way it was drawn. Drop one page, or a whole chapter.
          </p>
          <HalftoneBand theme={theme} opacity={0.55} style={{ marginTop: mobile ? 24 : 40 }} />
        </section>

        {/* Resume banner (deep-link guard, Rule 2) */}
        {showResume && (
          <section aria-label="Resume reading" style={{ marginTop: 22 }}>
            <ResumeBanner
              theme={theme}
              pageN={resumePageN}
              panelN={resumePanelN}
              onResume={() => onResume?.()}
              onDismiss={() => onResumeDismiss?.()}
            />
          </section>
        )}

        {/* Upload entry */}
        <section id="start" aria-labelledby="upload-title" style={{ marginTop: mobile ? 22 : 36 }}>
          <h2
            id="upload-title"
            style={{
              margin: 0,
              fontSize: mobile ? 22 : 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Start reading
          </h2>
          {demoMode ? (
            <>
              <p style={{ margin: "4px 0 18px", fontSize: 14, opacity: 0.6 }}>
                This public demo ships one openly-licensed chapter — nothing is uploaded here. Run
                Tobira locally to read your own files.
              </p>
              <DemoEntry theme={theme} mobile={mobile} onStart={onDemoStart} />
            </>
          ) : (
            <>
              <p style={{ margin: "4px 0 18px", fontSize: 14, opacity: 0.6 }}>
                Pages are sent only to your own locally-running detection server and are never
                stored permanently.
              </p>
              <ChapterUploadEntry
                theme={theme}
                mobile={mobile}
                onChapterSuccess={onChapterSuccess}
                onSingleSuccess={onSingleSuccess}
              />
            </>
          )}
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-title" style={{ marginTop: mobile ? 36 : 56 }}>
          <h2
            id="how-title"
            style={{
              margin: 0,
              fontSize: mobile ? 22 : 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            How it works
          </h2>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)",
              gap: mobile ? 14 : 20,
            }}
          >
            <HowStep
              n={1}
              title="Drop a page or .CBZ"
              body="One image, or a whole chapter archive. Pages are processed on the spot — nothing is kept."
              theme={theme}
            />
            <HowStep
              n={2}
              title="ML finds the panels"
              body="A small YOLO model detects each panel and crops it. You can reorder if the order's wrong."
              theme={theme}
            />
            <HowStep
              n={3}
              title="Read panel-by-panel"
              body="Swipe up for the next beat. Minimap shows where you are. Each panel lands clean."
              theme={theme}
              accent
            />
          </div>
        </section>
      </main>

      <LandingFooter theme={theme} mobile={mobile} />
    </div>
  );
}

function DemoEntry({
  theme,
  mobile,
  onStart,
}: {
  theme: ReaderTheme;
  mobile: boolean;
  onStart?: () => void;
}) {
  const t = tokens(theme);
  return (
    <article
      aria-label="Demo chapter"
      style={{
        border: `2px solid ${t.ink}`,
        boxShadow: `4px 4px 0 0 ${t.shadow}`,
        background: t.bg,
        display: "flex",
        flexDirection: mobile ? "column" : "row",
        gap: mobile ? 14 : 22,
        padding: 18,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static demo asset */}
      <img
        src={DEMO_COVER_URL}
        alt={`${DEMO_TITLE} — first page`}
        style={{
          width: mobile ? "100%" : 170,
          height: mobile ? 220 : 230,
          objectFit: "cover",
          objectPosition: "top",
          border: `2px solid ${t.ink}`,
        }}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: "0.16em",
            color: t.dim,
          }}
        >
          CURATED DEMO · {DEMO_PAGE_COUNT} PAGES · {DEMO_PANEL_COUNT} PANELS
        </div>
        <h3 style={{ margin: 0, fontSize: mobile ? 22 : 26, fontWeight: 700, lineHeight: 1.1 }}>
          {DEMO_TITLE}
        </h3>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, opacity: 0.8, maxWidth: 520 }}>
          Panels detected by the same model that powers the full tool. Swipe or arrow through the
          chapter beat by beat.
        </p>
        <div style={{ marginTop: "auto", paddingTop: 10 }}>
          <button
            type="button"
            onClick={() => onStart?.()}
            style={{
              ...zineButtonStyle(t, true),
              padding: "12px 22px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            READ THE DEMO →
          </button>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, opacity: 0.65 }}>
          {DEMO_ATTRIBUTION.work} by {DEMO_ATTRIBUTION.author} ·{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            rel="noreferrer"
            target="_blank"
            style={{ color: "inherit" }}
          >
            {DEMO_ATTRIBUTION.license}
          </a>{" "}
          ·{" "}
          <a
            href={DEMO_ATTRIBUTION.url}
            rel="noreferrer"
            target="_blank"
            style={{ color: "inherit" }}
          >
            peppercarrot.com
          </a>
        </p>
      </div>
    </article>
  );
}

function LandingNav({
  theme,
  mobile,
  isDark,
  onToggleTheme,
}: {
  theme: ReaderTheme;
  mobile: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
}) {
  const t = tokens(theme);
  return (
    <nav
      aria-label="Primary"
      style={{
        borderBottom: `2px solid ${t.ink}`,
        padding: mobile ? "12px 18px" : "14px 56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: t.bg,
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <a
        href="#hero-title"
        style={{
          textDecoration: "none",
          color: t.ink,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "'Geist Mono', ui-monospace, monospace",
          fontWeight: 700,
          letterSpacing: "0.18em",
          fontSize: 14,
        }}
      >
        <LogoMark theme={theme} />
        TOBIRA
      </a>
      {!mobile && (
        <div
          style={{
            display: "flex",
            gap: 22,
            alignItems: "center",
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 12,
            letterSpacing: "0.12em",
          }}
        >
          <a
            href="https://github.com/Hariharan79/tobira"
            style={navLink(t)}
            rel="noreferrer"
            target="_blank"
          >
            SOURCE
          </a>
          <ThemeToggle theme={theme} isDark={isDark} onToggle={onToggleTheme} />
          <a
            href="#start"
            style={{
              ...zineButtonStyle(t, true),
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            OPEN READER
          </a>
        </div>
      )}
      {mobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle theme={theme} isDark={isDark} onToggle={onToggleTheme} />
          <a
            href="#start"
            style={{
              ...zineButtonStyle(t, true),
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            OPEN READER
          </a>
        </div>
      )}
    </nav>
  );
}

function ThemeToggle({
  theme,
  isDark,
  onToggle,
}: {
  theme: ReaderTheme;
  isDark: boolean;
  onToggle: () => void;
}) {
  const t = tokens(theme);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
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
      {isDark ? (
        // Sun — switch to light
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="square"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
          <line x1="4.5" y1="4.5" x2="6.6" y2="6.6" />
          <line x1="17.4" y1="17.4" x2="19.5" y2="19.5" />
          <line x1="4.5" y1="19.5" x2="6.6" y2="17.4" />
          <line x1="17.4" y1="6.6" x2="19.5" y2="4.5" />
        </svg>
      ) : (
        // Moon — switch to dark
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
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}

function navLink(t: ReturnType<typeof tokens>) {
  return {
    textDecoration: "none",
    color: t.ink,
    opacity: 0.7,
    fontWeight: 600,
  } as const;
}

function LogoMark({ theme }: { theme: ReaderTheme }) {
  const t = tokens(theme);
  // New Tobira mark — door/panel ajar + halftone corner. Token-driven so it
  // inverts with the theme toggle (matches the light/dark export 1:1).
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" role="img" aria-label="Tobira">
      <rect x="3" y="3" width="58" height="58" fill="none" stroke={t.ink} strokeWidth="2" />
      <rect x="33" y="4" width="27" height="56" fill={t.accent} />
      <line x1="32" y1="4" x2="32" y2="28" stroke={t.ink} strokeWidth="2" />
      <line x1="32" y1="36" x2="32" y2="60" stroke={t.ink} strokeWidth="2" />
      <circle cx="38" cy="32" r="2" fill={t.bg} />
      <g fill={t.ink}>
        <circle cx="9" cy="47" r="1" />
        <circle cx="17" cy="47" r="1" />
        <circle cx="25" cy="47" r="1" />
        <circle cx="9" cy="55" r="1" />
        <circle cx="17" cy="55" r="1" />
        <circle cx="25" cy="55" r="1" />
        <circle cx="13" cy="51" r="1" />
        <circle cx="21" cy="51" r="1" />
      </g>
    </svg>
  );
}

function HowStep({
  n,
  title,
  body,
  theme,
  accent,
}: {
  n: number;
  title: string;
  body: string;
  theme: ReaderTheme;
  accent?: boolean;
}) {
  const t = tokens(theme);
  return (
    <article
      style={{
        position: "relative",
        background: accent ? t.accent : t.bg,
        color: accent ? t.accentInk : t.ink,
        border: `2px solid ${t.ink}`,
        boxShadow: `4px 4px 0 0 ${t.shadow}`,
        padding: "20px 18px 22px",
      }}
    >
      <div
        style={{
          fontFamily: "'Geist Mono', ui-monospace, monospace",
          fontSize: 12,
          letterSpacing: "0.14em",
          opacity: 0.7,
        }}
      >
        STEP {String(n).padStart(2, "0")}
      </div>
      <h3
        style={{
          margin: "8px 0 6px",
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          lineHeight: 1.1,
        }}
      >
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, opacity: 0.85 }}>{body}</p>
    </article>
  );
}

function LandingFooter({ theme, mobile }: { theme: ReaderTheme; mobile: boolean }) {
  const t = tokens(theme);
  return (
    <footer
      style={{
        borderTop: `2px solid ${t.ink}`,
        padding: mobile ? "16px 18px" : "20px 56px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "'Geist Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: "0.12em",
        color: t.dim,
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      <div>© 2026 TOBIRA · LOCAL-FIRST</div>
      <div style={{ display: "flex", gap: 16 }}>
        <a
          href="https://github.com/Hariharan79/tobira"
          rel="noreferrer"
          style={{ color: t.ink, textDecoration: "none", opacity: 0.8 }}
        >
          GITHUB
        </a>
        <a href="#start" style={{ color: t.ink, textDecoration: "none", opacity: 0.8 }}>
          RSS
        </a>
        <a href="#start" style={{ color: t.ink, textDecoration: "none", opacity: 0.8 }}>
          @TOBIRA
        </a>
      </div>
    </footer>
  );
}

function SectionLabel({ theme, children }: { theme: ReaderTheme; children: React.ReactNode }) {
  const t = tokens(theme);
  return (
    <div
      style={{
        fontFamily: "'Geist Mono', ui-monospace, monospace",
        fontSize: 11,
        letterSpacing: "0.16em",
        color: t.dim,
      }}
    >
      {children}
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
