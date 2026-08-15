import manifest from "./demo/pepper-carrot-ep02.json";
import type { ChapterReaderPageInput } from "@/components/reader/chapter-reader-shell";

/**
 * Demo mode (NEXT_PUBLIC_DEMO_MODE=1): the public deployment ships only a
 * curated, openly-licensed chapter and makes ZERO backend calls — no upload
 * UI, no detection API, no persistence probes. The full tool (upload your
 * own pages) is the default when the flag is unset, e.g. running locally.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

export const DEMO_TITLE = "Pepper&Carrot — Episode 2";
export const DEMO_PAGE_COUNT = manifest.page_count;
export const DEMO_PANEL_COUNT = manifest.pages.reduce((n, p) => n + p.panels.length, 0);

/** CC-BY 4.0 attribution — shown wherever the demo chapter is offered. */
export const DEMO_ATTRIBUTION = {
  work: "Pepper&Carrot, Episode 2",
  author: "David Revoy",
  license: "CC-BY 4.0",
  url: "https://www.peppercarrot.com",
};

/** Cover thumbnail for the demo entry card. */
export const DEMO_COVER_URL = "/demo/pepper-carrot-ep02/p001.jpg";

/**
 * The precomputed manifest mapped to the chapter reader's input contract.
 * Panels are already in reading order (LTR) with normalized [x,y,w,h] boxes.
 */
export function getDemoChapterPages(): ChapterReaderPageInput[] {
  return manifest.pages.map((page) => ({
    pageIndex: page.index,
    pageUrl: `/demo/pepper-carrot-ep02/${page.filename}`,
    panels: page.panels.map((p) => ({
      id: p.id,
      bbox: p.bbox,
      confidence: p.confidence,
    })),
  }));
}
