import axios from "axios";

import type {
  ChapterStatusResponse,
  ChapterUploadResponse,
  DetectionResponse,
  Panel,
} from "./types";

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
  }
): Promise<DetectionResponse> {
  const params = new URLSearchParams();
  if (options?.modelHint) params.set("model_hint", options.modelHint);
  if (options?.direction) params.set("direction", options.direction);

  const queryString = params.toString();
  const url = `/api/detect/${uuid}${queryString ? `?${queryString}` : ""}`;

  const response = await api.post<DetectionResponse>(url);
  return response.data;
}

/* ─────────────────────────────────────────────────────────────
 * Chapter (multi-page) client — Phase 5, distinct path from the
 * single-image upload/detect calls above (D-03). Reuses API_URL.
 * ───────────────────────────────────────────────────────────── */

/**
 * Upload a chapter: a single `.cbz` archive OR many image files at once.
 * Shared backend extraction path (D-01). Reuses the onUploadProgress idiom.
 *
 * @param filesOrCbz - one `.cbz` file, or a list of image files
 * @param onProgress - optional 0-100 progress callback
 */
export async function uploadChapter(
  filesOrCbz: File[],
  onProgress?: (progress: number) => void
): Promise<ChapterUploadResponse> {
  const formData = new FormData();
  const isSingleCbz = filesOrCbz.length === 1 && filesOrCbz[0].name.toLowerCase().endsWith(".cbz");

  if (isSingleCbz) {
    formData.append("file", filesOrCbz[0]);
  } else {
    for (const f of filesOrCbz) formData.append("files", f);
  }

  const response = await api.post<ChapterUploadResponse>("/api/chapter", formData, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });

  return response.data;
}

/** Full-page image bytes for chapter page `n` (0-based). */
export function getChapterPageImageUrl(comicUuid: string, page: number): string {
  return `${API_URL}/api/chapter/${comicUuid}/page/${page}/image`;
}

/** Native EventSource URL for chapter detection progress (SSE). */
export function getChapterEventsUrl(comicUuid: string): string {
  return `${API_URL}/api/chapter/${comicUuid}/events`;
}

/** Catch-up fetch for a single page's panels (D-09). */
export async function getChapterPagePanels(
  comicUuid: string,
  page: number
): Promise<{ page: number; status: string; panels: Panel[] }> {
  const response = await api.get<{
    page: number;
    status: string;
    panels: Panel[];
  }>(`/api/chapter/${comicUuid}/page/${page}`);
  return response.data;
}

/** Polling fallback for chapter detection progress (Pitfall 5). */
export async function getChapterStatus(comicUuid: string): Promise<ChapterStatusResponse> {
  const response = await api.get<ChapterStatusResponse>(`/api/chapter/${comicUuid}/status`);
  return response.data;
}
