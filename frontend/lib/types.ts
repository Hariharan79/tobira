/**
 * Panel detection result from backend.
 * Matches backend/app/models/schemas.py Panel schema.
 */
export interface Panel {
  id: number;
  /** Bounding box as [x, y, w, h] normalized 0-1 */
  bbox: [number, number, number, number];
  confidence: number;
}

/** Reading direction for panel ordering per ORD-01 */
export type ReadingDirection = "ltr" | "rtl";

/**
 * Response from POST /api/detect/{uuid}.
 * Matches backend/app/models/schemas.py DetectionResponse schema.
 */
export interface DetectionResponse {
  panels: Panel[];
  content_type: "manga" | "western" | "unknown";
  direction: ReadingDirection; // Reading direction applied per D-01
  ambiguous: boolean; // True if layout is ambiguous per D-12
}

/**
 * Image with detection results.
 * Used by page state to track current image and its panels.
 */
export interface ImageWithPanels {
  uuid: string;
  url: string;
  panels: Panel[] | null;
  contentType: "manga" | "western" | "unknown" | null;
  direction: ReadingDirection | null; // Reading direction per D-01
  ambiguous: boolean; // Ambiguous layout warning per D-12
  isDetecting: boolean;
}

/* ─────────────────────────────────────────────────────────────
 * Chapter (multi-page) types — Phase 5, distinct from single-image (D-03).
 * Mirror backend/app/models/schemas.py chapter models 1:1.
 * ───────────────────────────────────────────────────────────── */

/**
 * Response from POST /api/chapter.
 * Matches backend/app/models/schemas.py ChapterUploadResponse schema.
 */
export interface ChapterUploadResponse {
  comic_uuid: string;
  page_count: number;
}

/** Per-page detection lifecycle. */
export type PageStatusValue = "queued" | "detecting" | "done" | "error";

/**
 * One page's status in GET /api/chapter/{uuid}/status.
 * Matches backend/app/models/schemas.py PageStatus schema.
 */
export interface PageStatus {
  page: number;
  status: PageStatusValue;
  panels: Panel[] | null;
}

/**
 * Response from GET /api/chapter/{uuid}/status (SSE polling fallback).
 * Matches backend/app/models/schemas.py chapter status payload.
 */
export interface ChapterStatusResponse {
  pages: PageStatus[];
  page1_ready: boolean;
}

/**
 * One page in the chapter manifest.
 * Matches backend/app/models/schemas.py ChapterPage schema.
 */
export interface ChapterPage {
  index: number;
  filename: string;
  width: number;
  height: number;
  panels: Panel[];
}

/**
 * GET /api/chapter/{uuid}/manifest — uploads/<comic_uuid>/manifest.json.
 * Matches backend/app/models/schemas.py ChapterManifest schema.
 */
export interface ChapterManifest {
  comic_uuid: string;
  page_count: number;
  pages: ChapterPage[];
}
