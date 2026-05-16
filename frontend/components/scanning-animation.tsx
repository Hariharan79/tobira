"use client";

import { cn } from "@/lib/utils";

interface ScanningAnimationProps {
  className?: string;
  label?: string;
}

/**
 * ScanningAnimation — Neo Manga reinterpretation. A solid black sweeping band
 * passes top-to-bottom over the image while a halftone dot pattern fades in
 * and out behind it. A pill at the bottom announces "FINDING PANELS…".
 *
 * Reduced-motion: globals.css collapses all animations to ~0ms, so the user
 * sees the static end state (a faint halftone wash + the pill).
 */
export function ScanningAnimation({
  className,
  label = "FINDING PANELS…",
}: ScanningAnimationProps) {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
      aria-busy="true"
      aria-live="polite"
    >
      {/* halftone wash — softly visible while the bar sweeps */}
      <div aria-hidden className="halftone-band absolute inset-0 opacity-30" />

      {/* sweeping band — solid black, blends to translucent on edges */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-[14%]",
          "bg-gradient-to-b from-foreground/0 via-foreground/85 to-foreground/0"
        )}
        style={{
          animation: "scan-sweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        }}
      />

      {/* status pill — print-typesetter style, sits in the bottom band */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div
          className={cn(
            "flex items-center gap-2 px-3 h-9",
            "border-2 border-foreground bg-background text-foreground",
            "font-mono text-xs font-bold uppercase tracking-widest",
            "offset-shadow-md"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "inline-block h-2 w-2 bg-foreground",
              "[animation:pulse-mark_900ms_ease-in-out_infinite]"
            )}
          />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}
