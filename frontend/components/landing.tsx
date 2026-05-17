"use client";

import dynamic from "next/dynamic";
import { tokens, zineButtonStyle, type ReaderTheme } from "@/components/reader";
import { ResumeBanner } from "@/components/chapter/resume-banner";
import type { UploadResponse } from "@/lib/api";
import type { ChapterUploadResponse } from "@/lib/types";

// The interactive dropzone is a client island loaded lazily so the landing
// route ships minimal JS (Lighthouse — RESEARCH §Lighthouse Remediation).
// It pulls react-dropzone/sonner; keeping it dynamic keeps the hero fast.
const ChapterUploadEntry = dynamic(
  () => import("@/components/chapter/chapter-upload-entry").then((m) => m.ChapterUploadEntry),
  { ssr: false }
);

interface LandingProps {
  theme?: ReaderTheme;
  mobile?: boolean;
  onSingleSuccess: (data: UploadResponse) => void;
  onChapterSuccess: (data: ChapterUploadResponse) => void;
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
  theme = "light",
  mobile = false,
  onSingleSuccess,
  onChapterSuccess,
  showResume = false,
  resumePageN = 1,
  resumePanelN = 1,
  onResume,
  onResumeDismiss,
}: LandingProps) {
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
      <LandingNav theme={theme} mobile={mobile} />

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
          <p style={{ margin: "4px 0 18px", fontSize: 14, opacity: 0.6 }}>
            Files stay on your device. We never upload anything to a server.
          </p>
          <ChapterUploadEntry
            theme={theme}
            mobile={mobile}
            onChapterSuccess={onChapterSuccess}
            onSingleSuccess={onSingleSuccess}
          />
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
              body="One image, or a whole chapter archive. Everything is processed locally in your browser."
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

function LandingNav({ theme, mobile }: { theme: ReaderTheme; mobile: boolean }) {
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
          <a href="#how" style={navLink(t)}>
            HOW IT WORKS
          </a>
          <a href="#start" style={navLink(t)}>
            PRIVACY
          </a>
          <a href="https://github.com" style={navLink(t)} rel="noreferrer">
            SOURCE
          </a>
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
        <a
          href="#start"
          aria-label="Menu"
          style={{
            ...zineButtonStyle(t),
            width: 36,
            height: 36,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            textDecoration: "none",
          }}
        >
          <svg
            width="16"
            height="14"
            viewBox="0 0 16 14"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="0" y1="2" x2="16" y2="2" />
            <line x1="0" y1="7" x2="16" y2="7" />
            <line x1="0" y1="12" x2="16" y2="12" />
          </svg>
        </a>
      )}
    </nav>
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
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <rect x="1" y="1" width="20" height="20" fill="none" stroke={t.ink} strokeWidth="2" />
      <rect x="11" y="1" width="10" height="20" fill={t.accent} stroke={t.ink} strokeWidth="2" />
      <circle cx="14.5" cy="11" r="1.5" fill={t.bg} />
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
          href="https://github.com"
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
