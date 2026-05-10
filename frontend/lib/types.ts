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

/**
 * Response from POST /api/detect/{uuid}.
 * Matches backend/app/models/schemas.py DetectionResponse schema.
 */
export interface DetectionResponse {
  panels: Panel[];
  content_type: "manga" | "western" | "unknown";
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
  isDetecting: boolean;
}
