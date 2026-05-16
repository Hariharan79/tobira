import type { Panel } from "@/lib/types";

/**
 * Panel data for the reader, derived from detection Panel.
 * Normalized coordinates (0-1) for x, y, w, h.
 */
export interface ReaderPanel {
  /** 1-indexed panel number in reading order */
  n: number;
  /** X position (0-1) */
  x: number;
  /** Y position (0-1) */
  y: number;
  /** Width (0-1) */
  w: number;
  /** Height (0-1) */
  h: number;
  /** Original confidence score */
  confidence: number;
}

/**
 * Page data for the reader.
 */
export interface ReaderPage {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Image URL */
  imageUrl: string;
  /** Panels in reading order */
  panels: ReaderPanel[];
}

/**
 * Convert detection panels to reader format.
 */
export function toReaderPanels(panels: Panel[]): ReaderPanel[] {
  return panels.map((p) => ({
    n: p.id,
    x: p.bbox[0],
    y: p.bbox[1],
    w: p.bbox[2],
    h: p.bbox[3],
    confidence: p.confidence,
  }));
}

/**
 * Create a ReaderPage from detection data.
 */
export function createReaderPage(
  id: string,
  imageUrl: string,
  panels: Panel[],
  title = "Comic Page"
): ReaderPage {
  return {
    id,
    title,
    imageUrl,
    panels: toReaderPanels(panels),
  };
}
