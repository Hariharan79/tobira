"use client";

import { RefreshCw, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PanelOverlay } from "./panel-overlay";
import { ScanningAnimation } from "./scanning-animation";
import type { Panel } from "@/lib/types";

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
}

export function ImageDisplay({
  src,
  alt = "Uploaded comic page",
  onClear,
  panels,
  isDetecting = false,
  onRedetect,
  onStartReading,
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

        {/* Panel overlays when detection complete (per D-04) */}
        {!isDetecting && panels && <PanelOverlay panels={panels} />}
      </div>

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
