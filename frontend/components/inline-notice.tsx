"use client";

import { AlertTriangle, Info, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NoticeKind = "warning" | "info";

interface InlineNoticeProps {
  kind?: NoticeKind;
  title: string;
  description?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

/**
 * InlineNotice — soft-tinted strip used for ambiguous-layout warnings,
 * offline state, etc. Distinct from toasts (which are transient).
 *
 * Neo Manga: 2px black border, halftone backplate, monospace caps.
 */
export function InlineNotice({
  kind = "warning",
  title,
  description,
  dismissible = true,
  onDismiss,
  className,
}: InlineNoticeProps) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const Icon = kind === "warning" ? AlertTriangle : Info;

  const handleDismiss = () => {
    setOpen(false);
    onDismiss?.();
  };

  return (
    <div
      role={kind === "warning" ? "alert" : "status"}
      className={cn(
        "relative flex items-start gap-3 px-4 py-3",
        "border-2 border-foreground bg-background",
        "offset-shadow-sm",
        className
      )}
    >
      {/* halftone strip on the left edge as a graphic accent */}
      <div aria-hidden className="halftone-band absolute inset-y-0 left-0 w-2 opacity-90" />

      <Icon className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={2.5} />

      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>

      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notice"
          className={cn(
            "shrink-0 p-1 -m-1",
            "text-muted-foreground hover:text-foreground",
            "transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
