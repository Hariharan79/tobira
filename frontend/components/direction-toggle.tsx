"use client";

import { cn } from "@/lib/utils";
import type { ReadingDirection } from "@/lib/types";

interface DirectionToggleProps {
  direction: ReadingDirection;
  onChange: (direction: ReadingDirection) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * DirectionToggle: LTR/RTL toggle switch per D-06.
 *
 * Renders a toggle button with LTR/RTL labels.
 * Placement next to content type badge per D-07.
 */
export function DirectionToggle({
  direction,
  onChange,
  disabled = false,
  className,
}: DirectionToggleProps) {
  const isRtl = direction === "rtl";

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
        "flex items-center gap-2 px-3 py-1.5",
        "text-sm font-medium rounded-full",
        "border border-border",
        "transition-colors duration-200",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "hover:bg-muted",
        className
      )}
      aria-label={`Reading direction: ${direction.toUpperCase()}. Click to toggle.`}
      aria-pressed={isRtl}
    >
      {/* LTR label */}
      <span
        className={cn(
          "transition-colors duration-200",
          !isRtl && "text-foreground font-semibold",
          isRtl && "text-muted-foreground"
        )}
      >
        LTR
      </span>

      {/* Toggle track */}
      <div
        className={cn(
          "relative w-10 h-5 rounded-full",
          "bg-muted transition-colors duration-200",
          isRtl && "bg-primary/20"
        )}
      >
        {/* Toggle thumb */}
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full",
            "bg-primary transition-transform duration-200",
            !isRtl && "left-0.5",
            isRtl && "translate-x-5"
          )}
        />
      </div>

      {/* RTL label */}
      <span
        className={cn(
          "transition-colors duration-200",
          isRtl && "text-foreground font-semibold",
          !isRtl && "text-muted-foreground"
        )}
      >
        RTL
      </span>
    </button>
  );
}
