"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { uploadFile, type UploadResponse } from "@/lib/api";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB per D-06
const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

interface UploadState {
  progress: number;
  uploading: boolean;
}

export function useFileUpload(onSuccess: (data: UploadResponse) => void) {
  const [state, setState] = useState<UploadState>({
    progress: 0,
    uploading: false,
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Handle rejections
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        const error = rejection.errors[0];
        if (error.code === "file-too-large") {
          toast.error("File too large", {
            description: "Maximum file size is 20MB",
          });
        } else if (error.code === "file-invalid-type") {
          toast.error("Invalid file type", {
            description: "Only JPEG, PNG, and WebP images are allowed",
          });
        } else {
          toast.error("Upload failed", {
            description: error.message,
          });
        }
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      setState({ progress: 0, uploading: true });

      try {
        const data = await uploadFile(file, (progress) => {
          setState((prev) => ({ ...prev, progress }));
        });
        toast.success("Image uploaded", {
          description: `${data.dimensions.width} x ${data.dimensions.height}px`,
        });
        onSuccess(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upload failed";
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
    multiple: false,
  });

  return {
    ...state,
    ...dropzone,
  };
}
