"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AmbiguityBannerProps {
  className?: string;
}

/**
 * AmbiguityBanner: Warning banner for ambiguous panel layouts per D-12, D-13.
 *
 * Displays below the image per D-13.
 * Dismissable with X button per D-15.
 */
export function AmbiguityBanner({ className }: AmbiguityBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center justify-between gap-3",
        "px-4 py-3 rounded-lg",
        "bg-amber-50 dark:bg-amber-950/30",
        "border border-amber-200 dark:border-amber-800",
        "text-amber-800 dark:text-amber-200",
        "animate-in fade-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">
          Reading order may need adjustment for this layout.
        </p>
      </div>

      {/* Dismiss button per D-15 */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className={cn(
          "flex items-center justify-center",
          "w-6 h-6 rounded-full",
          "hover:bg-amber-200 dark:hover:bg-amber-800",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-amber-400"
        )}
        aria-label="Dismiss warning"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
