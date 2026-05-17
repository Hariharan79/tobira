"use client";

import type { DropzoneInputProps, DropzoneRootProps } from "react-dropzone";
import { tokens, zineButtonStyle, type ReaderTheme } from "@/components/reader";
import { useChapterUpload } from "@/lib/hooks/use-chapter-upload";
import { useFileUpload } from "@/lib/hooks/use-upload";
import type { UploadResponse } from "@/lib/api";
import type { ChapterUploadResponse } from "@/lib/types";

type TileKind = "single" | "chapter";
type TileState = "idle" | "drag" | "accepted" | "invalid" | "uploading";

interface ChapterUploadEntryProps {
  theme?: ReaderTheme;
  mobile?: boolean;
  onChapterSuccess: (data: ChapterUploadResponse) => void;
  onSingleSuccess: (data: UploadResponse) => void;
}

/**
 * ChapterUploadEntry — dual equal-weight dropzone tiles (single vs chapter).
 * Chapter tile drives the Phase-5 chapter pipeline; single tile reuses the
 * untouched Phase-1 single-image flow (D-03). Locked zine design.
 */
export function ChapterUploadEntry({
  theme = "light",
  mobile = false,
  onChapterSuccess,
  onSingleSuccess,
}: ChapterUploadEntryProps) {
  const chapter = useChapterUpload(onChapterSuccess);
  const single = useFileUpload(onSingleSuccess);

  const stack = mobile;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: stack ? "1fr" : "1fr 1fr",
        gap: stack ? 16 : 20,
        width: "100%",
      }}
    >
      <UploadTile
        theme={theme}
        kind="single"
        mobile={mobile}
        state={single.uploading ? "uploading" : single.isDragActive ? "drag" : "idle"}
        progress={single.progress}
        getRootProps={single.getRootProps}
        getInputProps={single.getInputProps}
      />
      <UploadTile
        theme={theme}
        kind="chapter"
        mobile={mobile}
        state={chapter.uploading ? "uploading" : chapter.isDragActive ? "drag" : "idle"}
        progress={chapter.progress}
        getRootProps={chapter.getRootProps}
        getInputProps={chapter.getInputProps}
      />
    </div>
  );
}

interface UploadTileProps {
  theme: ReaderTheme;
  kind: TileKind;
  state: TileState;
  mobile: boolean;
  progress: number;
  getRootProps: (props?: DropzoneRootProps) => DropzoneRootProps;
  getInputProps: (props?: DropzoneInputProps) => DropzoneInputProps;
}

function UploadTile({
  theme,
  kind,
  state,
  mobile,
  progress,
  getRootProps,
  getInputProps,
}: UploadTileProps) {
  const t = tokens(theme);
  const title = kind === "single" ? "SINGLE PAGE" : "CHAPTER";
  const sub =
    kind === "single"
      ? "Drop one image · JPG · PNG · WEBP"
      : "Drop a .CBZ archive — or many images at once";
  const tag = kind === "single" ? "PHASE 1" : "NEW · PHASE 5";

  const isDrag = state === "drag";
  const isErr = state === "invalid";

  const borderColor = isErr ? t.accent : t.ink;
  const bg = isDrag ? (theme === "dark" ? "#161616" : "#FFFFFF") : t.bg;
  const shadow = isDrag ? `6px 6px 0 0 ${t.accent}` : `4px 4px 0 0 ${t.shadow}`;

  return (
    <div
      {...getRootProps()}
      style={{
        position: "relative",
        background: bg,
        border: `2px solid ${borderColor}`,
        boxShadow: shadow,
        padding: mobile ? "20px 18px 18px" : "28px 26px 22px",
        transition: "box-shadow 80ms, transform 80ms",
        transform: isDrag ? "translate(-2px,-2px)" : "none",
        fontFamily: "'Geist Sans', system-ui, sans-serif",
        color: t.ink,
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <input {...getInputProps()} />

      {/* tag corner */}
      <div
        style={{
          position: "absolute",
          top: -2,
          right: -2,
          background: kind === "chapter" ? t.accent : t.ink,
          color: kind === "chapter" ? t.accentInk : t.bg,
          padding: "4px 8px",
          fontFamily: "'Geist Mono', ui-monospace, monospace",
          fontSize: 9,
          letterSpacing: "0.14em",
          fontWeight: 600,
        }}
      >
        {tag}
      </div>

      <div
        style={{
          fontFamily: "'Geist Mono', ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: "0.16em",
          color: t.dim,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: mobile ? 22 : 28,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
        }}
      >
        {kind === "single" ? "One page." : "A whole chapter."}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 13,
          opacity: 0.6,
          lineHeight: 1.4,
        }}
      >
        {sub}
      </div>

      {/* dropzone slab */}
      <div
        style={{
          marginTop: 18,
          border: `2px dashed ${isErr ? t.accent : t.lineStrong}`,
          background: isDrag
            ? theme === "dark"
              ? "rgba(255,59,48,0.08)"
              : "rgba(255,59,48,0.06)"
            : "transparent",
          height: mobile ? 130 : 160,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 16,
          position: "relative",
        }}
      >
        {state === "idle" && (
          <>
            <UploadGlyph theme={theme} kind={kind} />
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>
              {kind === "single" ? "Drop image here" : "Drop .cbz or images here"}
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: 10,
                color: t.dim,
                letterSpacing: "0.12em",
              }}
            >
              OR CLICK TO BROWSE
            </div>
          </>
        )}
        {state === "drag" && (
          <>
            <UploadGlyph theme={theme} kind={kind} accent />
            <div
              style={{
                marginTop: 10,
                fontSize: 14,
                fontWeight: 700,
                color: t.accent,
              }}
            >
              {kind === "single" ? "Release to upload" : "Release to read chapter"}
            </div>
          </>
        )}
        {state === "accepted" && (
          <>
            <div
              style={{
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: 11,
                letterSpacing: "0.16em",
                color: t.accent,
              }}
            >
              FILE READY
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {kind === "single" ? "page-03.png" : "tobira-ch01.cbz"}
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: t.dim }}>
              {kind === "single" ? "1.4 MB · 1600 × 2400" : "20 pages · 38 MB"}
            </div>
          </>
        )}
        {state === "invalid" && (
          <>
            <div
              style={{
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: 11,
                letterSpacing: "0.16em",
                color: t.accent,
              }}
            >
              UNSUPPORTED
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                fontWeight: 600,
                color: t.accent,
              }}
            >
              .pdf — use .cbz or images
            </div>
          </>
        )}
        {state === "uploading" && (
          <>
            <div
              style={{
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: 11,
                letterSpacing: "0.16em",
                color: t.dim,
              }}
            >
              UPLOADING
            </div>
            <div
              style={{
                marginTop: 10,
                width: "70%",
                height: 4,
                background: t.line,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${progress}%`,
                  background: t.accent,
                  transition: "width 150ms",
                }}
              />
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: 10,
                color: t.dim,
                letterSpacing: "0.12em",
              }}
            >
              {progress}% · 23.6 / 38 MB
            </div>
          </>
        )}
      </div>

      {/* action footer */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
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
          {kind === "single" ? "YOLO · PANEL DETECT" : "YOLO · PER-PAGE · STREAMS"}
        </div>
        <button
          type="button"
          disabled={state !== "accepted"}
          style={{
            ...zineButtonStyle(t, state === "accepted"),
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            opacity: state === "accepted" ? 1 : 0.4,
            cursor: state === "accepted" ? "pointer" : "not-allowed",
          }}
        >
          {kind === "single" ? "OPEN READER" : "PROCESS CHAPTER"}
        </button>
      </div>
    </div>
  );
}

function UploadGlyph({
  theme,
  kind,
  accent,
}: {
  theme: ReaderTheme;
  kind: TileKind;
  accent?: boolean;
}) {
  const t = tokens(theme);
  const c = accent ? t.accent : t.ink;
  if (kind === "single") {
    return (
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        stroke={c}
        strokeWidth="2.2"
        strokeLinecap="square"
        aria-hidden="true"
      >
        <rect x="6" y="4" width="24" height="28" />
        <line x1="6" y1="20" x2="30" y2="20" />
      </svg>
    );
  }
  return (
    <svg
      width="40"
      height="36"
      viewBox="0 0 40 36"
      fill="none"
      stroke={c}
      strokeWidth="2.2"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="22" height="26" />
      <rect x="9" y="3" width="22" height="26" />
      <line x1="3" y1="18" x2="25" y2="18" />
    </svg>
  );
}
