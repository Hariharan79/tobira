"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Panel, ReadingDirection } from "@/lib/types";
import { PanelOverlay } from "./panel-overlay";
import { ScanningAnimation } from "./scanning-animation";
import { ActionBar } from "./action-bar";
import { InlineNotice } from "./inline-notice";

export type PageViewState = "detecting" | "detected" | "ambiguous" | "zero-panels" | "error";

interface ImageDisplayProps {
  src: string;
  alt?: string;
  /** Panels from detection. null = not yet attempted. */
  panels?: Panel[] | null;
  isDetecting?: boolean;
  /**
   * Indicates the layout produced low-confidence reading order. When true,
   * the ambiguous-layout banner is shown above the action bar.
   */
  isAmbiguous?: boolean;
  /** Detection error message. When set, shows the error banner + retry. */
  errorMessage?: string | null;
  /** Auto-derived from content_type. user can override via DirectionToggle. */
  contentType?: "manga" | "western" | "unknown" | null;
  onClear?: () => void;
  onRedetect?: () => void;
  onStartReading?: () => void;
  /**
   * Apply a manual reading order (array of panel ids, in order) or null to
   * revert to the inferred order. Session-only (per D-16). Owned by parent.
   */
  onReorder?: (orderedIds: number[] | null) => void;
  /** Whether a manual order is currently applied (for the action bar badge) */
  isReordered?: boolean;
  /**
   * Optional controlled direction. When omitted, the component manages
   * direction internally based on contentType.
   */
  direction?: ReadingDirection;
  onDirectionChange?: (next: ReadingDirection) => void;
}

/**
 * ImageDisplay — the Page View shell. Header on top, comic image in the
 * middle (sitting directly on the background — no card chrome — so the
 * artwork is the only visual element), action bar with halftone band below.
 *
 * Visual direction: Neo Manga / Indie Zine. See PRD §4.2.
 */
export function ImageDisplay({
  src,
  alt = "Uploaded comic page",
  panels,
  isDetecting = false,
  isAmbiguous = false,
  errorMessage = null,
  contentType = null,
  onClear,
  onRedetect,
  onStartReading,
  onReorder,
  isReordered = false,
  direction: directionProp,
  onDirectionChange,
}: ImageDisplayProps) {
  // Manual reorder (per D-13–D-16). reorderMode is a transient UI state;
  // tapSeq is the panel-id order the user has tapped so far.
  const [reorderMode, setReorderMode] = useState(false);
  const [tapSeq, setTapSeq] = useState<number[]>([]);

  const enterReorder = () => {
    setTapSeq([]);
    setReorderMode(true);
  };

  const handlePanelTap = (panel: Panel) => {
    setTapSeq((seq) => (seq.includes(panel.id) ? seq : [...seq, panel.id]));
  };

  const finishReorder = () => {
    setReorderMode(false);
    if (!panels || tapSeq.length === 0) return;
    // Any panels the user didn't tap keep their existing relative order
    // appended after the explicitly-tapped ones — always a complete order.
    const rest = panels.map((p) => p.id).filter((id) => !tapSeq.includes(id));
    onReorder?.([...tapSeq, ...rest]);
  };

  const resetInferred = () => {
    setReorderMode(false);
    setTapSeq([]);
    onReorder?.(null);
  };
  const autoDirection: ReadingDirection = useMemo(
    () => (contentType === "manga" ? "rtl" : "ltr"),
    [contentType]
  );

  // Internal fallback so the component can render without a controlling parent.
  const [internalDirection, setInternalDirection] = useState<ReadingDirection>(autoDirection);
  const [isManualDirection, setIsManualDirection] = useState(false);

  // Keep internal direction in sync with auto unless the user has overridden it.
  useEffect(() => {
    if (!isManualDirection) setInternalDirection(autoDirection);
  }, [autoDirection, isManualDirection]);

  const direction = directionProp ?? internalDirection;

  const handleDirectionChange = (next: ReadingDirection) => {
    setIsManualDirection(true);
    setInternalDirection(next);
    onDirectionChange?.(next);
  };

  const hasPanels = !!panels && panels.length > 0;
  const showZeroState = !isDetecting && panels != null && panels.length === 0;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
      <div className="relative">
        {/* CLEAR (close) — sits as a small chip floating top-right of the image */}
        {onClear && (
          <button
            onClick={onClear}
            aria-label="Clear image and upload another"
            className={cn(
              "absolute top-2 right-2 z-20",
              "inline-flex items-center justify-center h-8 w-8",
              "border-2 border-foreground bg-background text-foreground",
              "transition-transform duration-100",
              "hover:-translate-x-px hover:-translate-y-px offset-shadow-sm",
              "active:translate-x-0 active:translate-y-0 active:shadow-none",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}

        {/* Image — sits directly on the background, no card chrome (per PRD) */}
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="block w-full h-auto" draggable={false} />

          {isDetecting && <ScanningAnimation />}

          {/* Panel overlays with direction for animation key (per D-08).
              In reorder mode the badges become tap-in-order chips. */}
          {!isDetecting && hasPanels && (
            <PanelOverlay
              panels={panels!}
              direction={direction}
              reorderMode={reorderMode}
              reorderedSequence={reorderMode ? tapSeq : undefined}
              onPanelClick={reorderMode ? handlePanelTap : undefined}
            />
          )}

          {showZeroState && (
            <div
              className={cn(
                "absolute inset-0",
                "flex items-center justify-center",
                "bg-background/85"
              )}
            >
              <div className="text-center max-w-xs px-6">
                <p className="font-mono text-xs font-bold uppercase tracking-widest mb-2">
                  No panels found
                </p>
                <p className="text-sm text-muted-foreground">
                  Try Redetect, or drop a different page.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Banners — only rendered after detection completes */}
      {!isDetecting && isAmbiguous && hasPanels && (
        <InlineNotice
          kind="warning"
          title="Reading order may be ambiguous"
          description="Try toggling LTR/RTL, or reorder panels manually."
        />
      )}

      {!isDetecting && errorMessage && (
        <InlineNotice kind="warning" title="Detection failed" description={errorMessage} />
      )}

      {/* Reorder controls replace the action bar while in reorder mode (D-15) */}
      {!isDetecting && reorderMode && (
        <div className="relative">
          <div aria-hidden className="halftone-band h-3 w-full mb-3 opacity-90" />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              aria-live="polite"
            >
              {tapSeq.length === 0
                ? "TAP PANELS IN READING ORDER"
                : `${tapSeq.length}/${panels?.length ?? 0} ASSIGNED`}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={resetInferred}
                aria-label="Reset to inferred order"
                className={cn(
                  "inline-flex items-center gap-2 px-3 h-9",
                  "font-mono text-xs font-bold uppercase tracking-widest",
                  "border-2 border-foreground bg-background text-foreground",
                  "offset-shadow-sm transition-transform duration-100",
                  "hover:-translate-x-px hover:-translate-y-px",
                  "active:translate-x-0 active:translate-y-0 active:shadow-none",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                Reset to inferred
              </button>
              <button
                type="button"
                onClick={finishReorder}
                disabled={tapSeq.length === 0}
                aria-label="Done reordering"
                className={cn(
                  "inline-flex items-center gap-2 px-4 h-9",
                  "font-mono text-xs font-bold uppercase tracking-widest",
                  "border-2 border-foreground bg-foreground text-background",
                  "offset-shadow-md transition-transform duration-100",
                  "hover:-translate-x-px hover:-translate-y-px",
                  "active:translate-x-0 active:translate-y-0 active:shadow-none",
                  "disabled:opacity-40 disabled:pointer-events-none",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action bar — visible when not actively scanning and not reordering */}
      {!isDetecting && !reorderMode && (
        <ActionBar
          panelCount={panels?.length ?? null}
          contentType={contentType}
          direction={direction}
          isAutoDirection={!isManualDirection}
          onDirectionChange={handleDirectionChange}
          onRedetect={onRedetect}
          onStartReading={onStartReading}
          onReorder={onReorder ? enterReorder : undefined}
          isReordered={isReordered}
          hasPanels={hasPanels}
        />
      )}
    </div>
  );
}
