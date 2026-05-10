"use client";

import { RefreshCw, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PanelOverlay } from "./panel-overlay";
import { ScanningAnimation } from "./scanning-animation";
import { DirectionToggle } from "./direction-toggle";
import { AmbiguityBanner } from "./ambiguity-banner";
import type { Panel, ReadingDirection } from "@/lib/types";

interface ImageDisplayProps {
  src: string;
  alt?: string;
  onClear?: () => void;
  /** Detected panels to overlay (null = not yet detected) */
  panels?: Panel[] | null;
  /** Whether detection is in progress */
  isDetecting?: boolean;
  /** Callback when redetect button clicked */
  onRedetect?: () => void;
  /** Callback when start reading button clicked (Phase 4) */
  onStartReading?: () => void;
  /** Content type from detection (Phase 3) */
  contentType?: "manga" | "western" | "unknown" | null;
  /** Reading direction from detection (Phase 3) */
  direction?: ReadingDirection | null;
  /** Whether layout is ambiguous (Phase 3) */
  ambiguous?: boolean;
  /** Callback when direction toggle clicked (Phase 3) */
  onDirectionChange?: (direction: ReadingDirection) => void;
}

export function ImageDisplay({
  src,
  alt = "Uploaded comic page",
  onClear,
  panels,
  isDetecting = false,
  onRedetect,
  onStartReading,
  contentType,
  direction,
  ambiguous = false,
  onDirectionChange,
}: ImageDisplayProps) {
  const hasDetectedPanels = panels && panels.length > 0;

  return (
    <div className="relative w-full max-w-4xl animate-in fade-in duration-300">
      {/* Clear button */}
      {onClear && (
        <button
          onClick={onClear}
          className={cn(
            "absolute -top-3 -right-3 z-20",
            "flex items-center justify-center",
            "w-8 h-8 rounded-full",
            "bg-background border border-border shadow-md",
            "hover:bg-muted transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring"
          )}
          aria-label="Clear image and upload another"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Image container with relative positioning for overlays */}
      <div className="relative rounded-lg overflow-hidden shadow-lg">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto"
        />

        {/* Scanning animation during detection (per D-06) */}
        {isDetecting && <ScanningAnimation />}

        {/* Panel overlays when detection complete (per D-04, D-08) */}
        {!isDetecting && panels && (
          <PanelOverlay panels={panels} direction={direction || "ltr"} />
        )}
      </div>

      {/* Content type badge with direction per D-04, D-07 */}
      {!isDetecting && contentType && contentType !== "unknown" && (
        <div className="mt-3 flex items-center justify-center gap-3">
          {/* Content type badge showing direction per D-04 */}
          <span className="text-sm font-medium text-muted-foreground">
            {contentType === "manga" ? "Manga" : "Western"} (
            {direction?.toUpperCase() || "..."})
          </span>

          {/* Direction toggle per D-06, D-07 */}
          {direction && onDirectionChange && (
            <DirectionToggle
              direction={direction}
              onChange={onDirectionChange}
              disabled={isDetecting}
            />
          )}
        </div>
      )}

      {/* Ambiguity warning banner per D-12, D-13 */}
      {!isDetecting && ambiguous && (
        <AmbiguityBanner className="mt-3 w-full max-w-md mx-auto" />
      )}

      {/* Action buttons below image */}
      {!isDetecting && (
        <div className="mt-4 flex items-center justify-center gap-3">
          {/* Redetect button (per D-03: ROADMAP success criteria #5) */}
          {onRedetect && (
            <button
              onClick={onRedetect}
              className={cn(
                "flex items-center gap-2 px-4 py-2",
                "text-sm font-medium",
                "rounded-lg border border-border",
                "bg-background hover:bg-muted",
                "transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
              aria-label="Redetect panels"
            >
              <RefreshCw className="h-4 w-4" />
              Redetect
            </button>
          )}

          {/* Start reading CTA (per D-04: prominent button) */}
          {hasDetectedPanels && onStartReading && (
            <button
              onClick={onStartReading}
              className={cn(
                "flex items-center gap-2 px-6 py-2",
                "text-sm font-medium",
                "rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "transition-colors",
                "shadow-md",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
              aria-label="Start reading panels"
            >
              <Play className="h-4 w-4" />
              Start Reading
            </button>
          )}

          {/* No panels message */}
          {panels && panels.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No panels detected. Try a different image or use Redetect.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
