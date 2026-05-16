"use client";

import { cn } from "@/lib/utils";
import type { Panel, ReadingDirection } from "@/lib/types";

interface PanelOverlayProps {
  panels: Panel[];
  /** For animation key per D-08 - remount badges on direction change */
  direction?: ReadingDirection;
  /**
   * Reorder mode (Phase 4 territory). When true, the badges become
   * tap-in-order chips and click handler fires per panel.
   */
  reorderMode?: boolean;
  /** Manually-assigned order for each panel.id when reorderMode is true */
  reorderedSequence?: number[];
  onPanelClick?: (panel: Panel) => void;
  /** Stagger reveal delay between badges, ms. Set 0 to skip animation. */
  staggerMs?: number;
  className?: string;
}

/**
 * PanelOverlay — Neo Manga / Indie Zine. Square chip badges with a 2px black
 * border and an offset shadow. The badge sits in the top-left of each panel
 * with a small white backplate so it stays legible against any artwork (the
 * #1 a11y constraint named in the PRD §8).
 */
export function PanelOverlay({
  panels,
  direction = "ltr",
  reorderMode = false,
  reorderedSequence,
  onPanelClick,
  staggerMs = 60,
  className,
}: PanelOverlayProps) {
  return (
    <div className={cn("absolute inset-0", className)}>
      {panels.map((panel, idx) => {
        const [x, y, w, h] = panel.bbox;
        const sequenceNumber =
          reorderMode && reorderedSequence ? reorderedSequence.indexOf(panel.id) + 1 : panel.id;
        const isAssigned = !reorderMode || (reorderedSequence?.indexOf(panel.id) ?? -1) >= 0;

        return (
          <div
            key={panel.id}
            className={cn(
              "absolute",
              "border-2 border-foreground",
              // monochrome wash — extremely subtle so artwork stays readable
              "bg-foreground/[0.04]",
              "transition-[background-color,border-color] duration-150",
              // hover deepens the border so the panel reads as "selectable"
              reorderMode && "hover:bg-foreground/[0.10] cursor-pointer pointer-events-auto",
              !reorderMode && "pointer-events-none"
            )}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${w * 100}%`,
              height: `${h * 100}%`,
            }}
            onClick={reorderMode && onPanelClick ? () => onPanelClick(panel) : undefined}
            role={reorderMode ? "button" : undefined}
            aria-label={
              reorderMode
                ? `Panel ${panel.id}, ${
                    isAssigned ? `assigned position ${sequenceNumber}` : "unassigned"
                  }`
                : `Panel ${panel.id}`
            }
          >
            {/* Key includes direction to force remount on toggle (per D-08) */}
            <Badge
              key={`badge-${panel.id}-${direction}`}
              number={isAssigned ? sequenceNumber : null}
              confidence={panel.confidence}
              isReorder={reorderMode}
              animationDelay={staggerMs > 0 ? idx * staggerMs : 0}
            />
          </div>
        );
      })}
    </div>
  );
}

function Badge({
  number,
  confidence,
  isReorder,
  animationDelay,
}: {
  number: number | null;
  confidence: number;
  isReorder: boolean;
  animationDelay: number;
}) {
  return (
    <span
      title={`Confidence ${Math.round(confidence * 100)}%`}
      className={cn(
        // square chip, 30px-ish, sits half outside the panel for visual punch
        "absolute -top-[14px] -left-[14px]",
        "inline-flex items-center justify-center",
        "h-[30px] w-[30px]",
        "border-2 border-foreground",
        "bg-foreground text-background",
        "font-mono font-bold tabular-nums text-[13px] leading-none",
        "offset-shadow-sm",
        // entrance: pop in with a small overshoot
        "[animation:badge-pop_360ms_cubic-bezier(0.2,0.8,0.2,1)_both]",
        isReorder &&
          number === null &&
          "bg-background text-foreground [animation:pulse-mark_1400ms_ease-in-out_infinite]"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {number ?? "·"}
    </span>
  );
}
