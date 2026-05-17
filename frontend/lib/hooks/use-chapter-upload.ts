"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { uploadChapter } from "@/lib/api";
import type { ChapterUploadResponse } from "@/lib/types";

// ~100MB chapter ceiling — matches Plan 03's server-side cap.
const MAX_SIZE = 100 * 1024 * 1024;

// Accept .cbz by EXTENSION — its MIME is browser-dependent
// (application/octet-stream or application/zip). RESEARCH Pitfall 6.
const ACCEPTED_TYPES = {
  "application/octet-stream": [".cbz"],
  "application/zip": [".cbz"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

interface ChapterUploadState {
  progress: number;
  uploading: boolean;
}

export function useChapterUpload(onSuccess: (data: ChapterUploadResponse) => void) {
  const [state, setState] = useState<ChapterUploadState>({
    progress: 0,
    uploading: false,
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        const error = rejection.errors[0];
        if (error.code === "file-too-large") {
          toast.error("File too large", {
            description: "Maximum chapter size is 100MB",
          });
        } else if (error.code === "file-invalid-type") {
          // UI-SPEC locked copy for the wrong type.
          toast.error("UNSUPPORTED", {
            description: ".pdf — use .cbz or images",
          });
        } else {
          toast.error("Upload failed", {
            description: error.message,
          });
        }
        return;
      }

      if (acceptedFiles.length === 0) return;

      setState({ progress: 0, uploading: true });

      try {
        const data = await uploadChapter(acceptedFiles, (progress) => {
          setState((prev) => ({ ...prev, progress }));
        });
        toast.success("Chapter uploaded", {
          description: `${data.page_count} page${data.page_count === 1 ? "" : "s"}`,
        });
        onSuccess(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.error("Upload failed", {
          description: message,
        });
      } finally {
        setState({ progress: 0, uploading: false });
      }
    },
    [onSuccess]
  );

  const dropzone = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: true,
  });

  return {
    ...state,
    ...dropzone,
  };
}
