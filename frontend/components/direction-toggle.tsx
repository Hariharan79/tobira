"use client";

import { cn } from "@/lib/utils";
import type { ReadingDirection } from "@/lib/types";

// Re-export for consumers
export type { ReadingDirection };

interface DirectionToggleProps {
  /** Current direction value */
  value: ReadingDirection;
  /** Callback when direction changes */
  onChange: (direction: ReadingDirection) => void;
  /** Shows "(auto)" indicator when true */
  isAuto?: boolean;
  /** Size variant */
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

/**
 * DirectionToggle: LTR/RTL toggle switch per D-06.
 *
 * Neo Manga / Indie Zine style - square chip buttons with offset shadow.
 * Placement next to content type badge per D-07.
 */
export function DirectionToggle({
  value,
  onChange,
  isAuto = false,
  size = "md",
  disabled = false,
  className,
}: DirectionToggleProps) {
  const isRtl = value === "rtl";

  const handleClick = () => {
    if (!disabled) {
      onChange(isRtl ? "ltr" : "rtl");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2",
        "font-mono font-bold uppercase tracking-widest",
        "border-2 border-foreground bg-background text-foreground",
        "transition-transform duration-100",
        "hover:-translate-x-px hover:-translate-y-px offset-shadow-sm",
        "active:translate-x-0 active:translate-y-0 active:shadow-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled && "opacity-50 cursor-not-allowed",
        size === "sm" && "px-2 h-7 text-[10px]",
        size === "md" && "px-3 h-9 text-xs",
        className
      )}
      aria-label={`Reading direction: ${value.toUpperCase()}${isAuto ? " (auto-detected)" : ""}. Click to toggle.`}
      aria-pressed={isRtl}
    >
      {/* LTR label */}
      <span
        className={cn(
          "transition-colors duration-100",
          !isRtl && "text-foreground",
          isRtl && "text-muted-foreground"
        )}
      >
        LTR
      </span>

      {/* Slash divider */}
      <span className="text-muted-foreground/50">/</span>

      {/* RTL label */}
      <span
        className={cn(
          "transition-colors duration-100",
          isRtl && "text-foreground",
          !isRtl && "text-muted-foreground"
        )}
      >
        RTL
      </span>
    </button>
  );
}
