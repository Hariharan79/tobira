"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageDisplayProps {
  src: string;
  alt?: string;
  onClear?: () => void;
}

export function ImageDisplay({ src, alt = "Uploaded comic page", onClear }: ImageDisplayProps) {
  return (
    <div className="relative w-full max-w-4xl animate-in fade-in duration-300">
      {onClear && (
        <button
          onClick={onClear}
          className={cn(
            "absolute -top-3 -right-3 z-10",
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
      <img
        src={src}
        alt={alt}
        className="w-full h-auto rounded-lg shadow-lg"
      />
    </div>
  );
}
