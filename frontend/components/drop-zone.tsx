"use client";

import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileUpload } from "@/lib/hooks/use-upload";
import type { UploadResponse } from "@/lib/api";

interface DropZoneProps {
  onUploadSuccess: (data: UploadResponse) => void;
}

export function DropZone({ onUploadSuccess }: DropZoneProps) {
  const { getRootProps, getInputProps, isDragActive, uploading, progress } =
    useFileUpload(onUploadSuccess);

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex flex-col items-center justify-center",
        "w-full max-w-2xl aspect-video",
        "border-2 border-dashed rounded-xl",
        "cursor-pointer transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isDragActive
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        uploading && "pointer-events-none"
      )}
    >
      <input {...getInputProps()} />

      <div
        className={cn(
          "flex flex-col items-center gap-4 p-8 text-center",
          "transition-transform duration-200",
          isDragActive && "scale-105"
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploading...</p>
              <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </div>
          </>
        ) : isDragActive ? (
          <>
            <Upload className="h-12 w-12 text-primary" />
            <p className="text-sm font-medium">Drop your image here</p>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Drag and drop your comic page
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse (JPEG, PNG, WebP up to 20MB)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
