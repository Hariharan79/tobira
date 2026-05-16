"use client";

import { Play, RefreshCw, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { DirectionToggle, type ReadingDirection } from "./direction-toggle";

interface ActionBarProps {
  panelCount: number | null;
  contentType: "manga" | "western" | "unknown" | null;
  direction: ReadingDirection;
  isAutoDirection: boolean;
  onDirectionChange: (next: ReadingDirection) => void;
  onRedetect?: () => void;
  onStartReading?: () => void;
  /** Enter manual reorder mode (per D-13) */
  onReorder?: () => void;
  /** Whether a manual order is currently applied (badge the button) */
  isReordered?: boolean;
  /** Hide the Start Reading CTA when zero panels detected */
  hasPanels: boolean;
  className?: string;
}

export function ActionBar({
  panelCount,
  contentType,
  direction,
  isAutoDirection,
  onDirectionChange,
  onRedetect,
  onStartReading,
  onReorder,
  isReordered = false,
  hasPanels,
  className,
}: ActionBarProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Halftone band sits above the bar as a graphic accent. */}
      <div aria-hidden className="halftone-band h-3 w-full mb-3 opacity-90" />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Status — left cluster */}
        <StatusLine
          panelCount={panelCount}
          contentType={contentType}
          direction={direction}
          isAutoDirection={isAutoDirection}
        />

        {/* Controls — right cluster */}
        <div className="flex flex-wrap items-center gap-3">
          <DirectionToggle
            value={direction}
            onChange={onDirectionChange}
            isAuto={isAutoDirection}
            size="md"
          />

          {onRedetect && (
            <GhostButton onClick={onRedetect} ariaLabel="Redetect panels">
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>Redetect</span>
            </GhostButton>
          )}

          {hasPanels && onReorder && (
            <GhostButton onClick={onReorder} ariaLabel="Manually reorder panels">
              <ListOrdered className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>{isReordered ? "Reorder ✓" : "Reorder"}</span>
            </GhostButton>
          )}

          {hasPanels && onStartReading && (
            <SolidButton onClick={onStartReading} ariaLabel="Start reading panel by panel">
              <Play className="h-3.5 w-3.5 fill-current" strokeWidth={2.5} />
              <span>Start Reading</span>
            </SolidButton>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusLine({
  panelCount,
  contentType,
  direction,
  isAutoDirection,
}: {
  panelCount: number | null;
  contentType: "manga" | "western" | "unknown" | null;
  direction: ReadingDirection;
  isAutoDirection: boolean;
}) {
  const parts: string[] = [];
  if (panelCount === null) {
    parts.push("WAITING");
  } else if (panelCount === 0) {
    parts.push("0 PANELS");
  } else {
    parts.push(`${panelCount} PANEL${panelCount === 1 ? "" : "S"}`);
  }
  parts.push(direction.toUpperCase());
  if (contentType) parts.push(contentType.toUpperCase());
  parts.push(isAutoDirection ? "AUTO" : "MANUAL");

  return (
    <p
      className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
      aria-live="polite"
    >
      {parts.join(" · ")}
    </p>
  );
}

function GhostButton({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        // print-typesetter: thick border, hard offset shadow, no border-radius
        "inline-flex items-center gap-2 px-3 h-9",
        "font-mono text-xs font-bold uppercase tracking-widest",
        "border-2 border-foreground bg-background text-foreground",
        "offset-shadow-sm",
        "transition-transform duration-100",
        "hover:-translate-x-px hover:-translate-y-px",
        "active:translate-x-0 active:translate-y-0 active:shadow-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      {children}
    </button>
  );
}

function SolidButton({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-2 px-4 h-9",
        "font-mono text-xs font-bold uppercase tracking-widest",
        "border-2 border-foreground bg-foreground text-background",
        "offset-shadow-md",
        "transition-transform duration-100",
        "hover:-translate-x-px hover:-translate-y-px",
        "active:translate-x-0 active:translate-y-0 active:shadow-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      {children}
    </button>
  );
}
