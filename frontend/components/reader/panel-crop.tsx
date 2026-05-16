"use client";

import { tokens, type ReaderTheme } from "./tokens";
import type { ReaderPanel } from "./types";

interface PanelCropProps {
  /** Panel region (normalized 0-1 coords relative to the full page) */
  panel: ReaderPanel;
  /** Full page image URL */
  imageUrl: string;
  /** Natural pixel width of the full page image */
  pageWidth: number;
  /** Natural pixel height of the full page image */
  pageHeight: number;
  /** Theme for border/shadow chrome */
  theme: ReaderTheme;
}

/**
 * PanelCrop — shows ONLY the panel's region of the full page image,
 * with zero distortion.
 *
 * The earlier implementation scaled the image width by 1/w and height by
 * 1/h independently, which stretched the artwork to each panel's aspect
 * ratio (the "misaligned boxes" bug). The correct technique:
 *
 *  1. Size the frame to the panel region's TRUE pixel aspect ratio:
 *     (panel.w * pageWidth) / (panel.h * pageHeight).
 *  2. Use a CSS background where `background-size` enlarges the page so the
 *     w×h sub-rect exactly fills the frame, and `background-position` uses
 *     the standard CSS percentage formula to align the (x, y) corner.
 *
 * Because the frame's aspect ratio equals the region's true aspect ratio,
 * the 1/w (x) and 1/h (y) background scale factors resolve to the SAME
 * physical scale — so the artwork is never stretched.
 */
export function PanelCrop({ panel, imageUrl, pageWidth, pageHeight, theme }: PanelCropProps) {
  const t = tokens(theme);

  // True pixel aspect ratio of just this panel's region.
  const regionAspect = (panel.w * pageWidth) / (panel.h * pageHeight) || 1;

  // CSS percentage background-position: p = offset / (1 - size).
  // Guard the degenerate full-bleed case (w or h === 1 → divide by zero).
  const posX = panel.w >= 1 ? 0 : (panel.x / (1 - panel.w)) * 100;
  const posY = panel.h >= 1 ? 0 : (panel.y / (1 - panel.h)) * 100;

  return (
    <div
      style={{
        position: "relative",
        // Fit the region inside the viewport while preserving its true
        // aspect ratio. The parent section centers this.
        aspectRatio: String(regionAspect),
        maxWidth: "92vw",
        maxHeight: "84vh",
        width: regionAspect >= 1 ? "min(92vw, calc(84vh * " + regionAspect + "))" : "auto",
        height: regionAspect < 1 ? "min(84vh, calc(92vw / " + regionAspect + "))" : "auto",
        border: `2px solid ${t.ink}`,
        boxShadow: `8px 8px 0 0 ${t.shadow}`,
        backgroundColor: theme === "dark" ? "#1A1A1A" : "#FFFFFF",
        backgroundImage: `url(${imageUrl})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${100 / panel.w}% ${100 / panel.h}%`,
        backgroundPosition: `${posX}% ${posY}%`,
        flexShrink: 0,
      }}
      role="img"
      aria-label={`Panel ${panel.n}`}
    />
  );
}
