"use client";

import { cn } from "@/lib/utils";
import type { Panel } from "@/lib/types";

interface PanelOverlayProps {
  panels: Panel[];
  className?: string;
}

/**
 * PanelOverlay: Renders panel bounding boxes over an image.
 *
 * Uses CSS absolute positioning with percentage-based coordinates
 * for responsive scaling (per D-04: minimal overlay visualization).
 *
 * Must be used inside a relative-positioned container that wraps the image.
 */
export function PanelOverlay({ panels, className }: PanelOverlayProps) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {panels.map((panel) => {
        const [x, y, w, h] = panel.bbox;
        return (
          <div
            key={panel.id}
            className={cn(
              "absolute",
              "border-2 border-primary/70",
              "rounded-sm",
              "transition-all duration-200"
            )}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${w * 100}%`,
              height: `${h * 100}%`,
            }}
          >
            {/* Numbered badge at top-left corner (per D-04) */}
            <span
              className={cn(
                "absolute -top-3 -left-3",
                "w-6 h-6 rounded-full",
                "bg-primary text-primary-foreground",
                "text-xs font-bold",
                "flex items-center justify-center",
                "shadow-md",
                "pointer-events-auto cursor-default"
              )}
              title={`Panel ${panel.id} (${Math.round(panel.confidence * 100)}% confidence)`}
            >
              {panel.id}
            </span>
          </div>
        );
      })}
    </div>
  );
}
