import axios from "axios";

import type { DetectionResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UploadResponse {
  uuid: string;
  dimensions: {
    width: number;
    height: number;
  };
  url: string;
}

export const api = axios.create({
  baseURL: API_URL,
});

export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<UploadResponse>("/api/upload", formData, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        const progress = Math.round((event.loaded * 100) / event.total);
        onProgress(progress);
      }
    },
  });

  return response.data;
}

export function getImageUrl(uuid: string): string {
  return `${API_URL}/api/uploads/${uuid}`;
}

/**
 * Detect panels in an uploaded image.
 *
 * @param uuid - Upload UUID from /api/upload
 * @param options - Optional detection options
 * @param options.modelHint - "manga" or "western" to override auto-detection
 * @param options.direction - "ltr" or "rtl" to override auto direction (per D-05)
 * @returns DetectionResponse with panels array, content_type, direction, and ambiguous flag
 */
export async function detectPanels(
  uuid: string,
  options?: {
    modelHint?: "manga" | "western";
    direction?: "ltr" | "rtl";
  },
): Promise<DetectionResponse> {
  const params = new URLSearchParams();
  if (options?.modelHint) params.set("model_hint", options.modelHint);
  if (options?.direction) params.set("direction", options.direction);

  const queryString = params.toString();
  const url = `/api/detect/${uuid}${queryString ? `?${queryString}` : ""}`;

  const response = await api.post<DetectionResponse>(url);
  return response.data;
}
