"use client";

import { cn } from "@/lib/utils";

interface ScanningAnimationProps {
  className?: string;
}

/**
 * ScanningAnimation: Overlay effect during panel detection.
 *
 * Shows a pulsing grid pattern that simulates scanning (per D-06).
 * Used inside a relative container over the image during detection.
 */
export function ScanningAnimation({ className }: ScanningAnimationProps) {
  return (
    <div
      className={cn(
        "absolute inset-0",
        "pointer-events-none",
        "overflow-hidden",
        className
      )}
    >
      {/* Pulsing overlay */}
      <div
        className={cn(
          "absolute inset-0",
          "bg-primary/5",
          "animate-pulse"
        )}
      />

      {/* Scanning line effect */}
      <div
        className={cn(
          "absolute inset-x-0 h-1",
          "bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        )}
        style={{
          animation: "scan 2s ease-in-out infinite",
        }}
      />

      {/* Grid pattern */}
      <div
        className={cn(
          "absolute inset-0",
          "opacity-20"
        )}
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Status text */}
      <div
        className={cn(
          "absolute bottom-4 left-1/2 -translate-x-1/2",
          "px-4 py-2 rounded-full",
          "bg-background/90 backdrop-blur-sm",
          "border border-border shadow-lg",
          "flex items-center gap-2"
        )}
      >
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-medium">Detecting panels...</span>
      </div>

      {/* CSS for scan animation */}
      <style jsx>{`
        @keyframes scan {
          0%, 100% {
            top: 0%;
          }
          50% {
            top: 100%;
          }
        }
      `}</style>
    </div>
  );
}
