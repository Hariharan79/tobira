/**
 * Demo chapter contract (EXPO: backend-free public demo).
 *
 * The bundled manifest must satisfy exactly what ChapterReaderShell
 * consumes: every page fully detected (no "detecting" holds in the demo),
 * normalized bboxes, sequential panel ids in reading order.
 */

import { describe, it, expect } from "vitest";
import { DEMO_PAGE_COUNT, DEMO_PANEL_COUNT, getDemoChapterPages } from "@/lib/demo";
import { buildChapterSections } from "@/components/reader/chapter-reader-shell";

describe("demo chapter manifest", () => {
  const pages = getDemoChapterPages();

  it("page count matches the manifest and indexes are sequential", () => {
    expect(pages).toHaveLength(DEMO_PAGE_COUNT);
    expect(pages.map((p) => p.pageIndex)).toEqual(pages.map((_, i) => i));
  });

  it("every page points at a bundled static asset", () => {
    for (const p of pages) {
      expect(p.pageUrl).toMatch(/^\/demo\/pepper-carrot-ep02\/p\d{3}\.jpg$/);
    }
  });

  it("every page has panels — the demo must never show a detecting hold", () => {
    for (const p of pages) {
      expect(p.panels).not.toBeNull();
      expect(p.panels!.length).toBeGreaterThan(0);
    }
    const total = pages.reduce((n, p) => n + (p.panels?.length ?? 0), 0);
    expect(total).toBe(DEMO_PANEL_COUNT);
  });

  it("panel bboxes are normalized [x,y,w,h] within the page", () => {
    for (const p of pages) {
      for (const panel of p.panels!) {
        const [x, y, w, h] = panel.bbox;
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(w).toBeGreaterThan(0);
        expect(h).toBeGreaterThan(0);
        expect(x + w).toBeLessThanOrEqual(1.0001);
        expect(y + h).toBeLessThanOrEqual(1.0001);
      }
    }
  });

  it("panel ids are sequential reading order starting at 1", () => {
    for (const p of pages) {
      expect(p.panels!.map((panel) => panel.id)).toEqual(p.panels!.map((_, i) => i + 1));
    }
  });

  it("builds a continuous section list with one end card and no detecting sections", () => {
    const sections = buildChapterSections(pages);
    expect(sections.filter((s) => s.kind === "detecting")).toHaveLength(0);
    expect(sections.filter((s) => s.kind === "end")).toHaveLength(1);
    expect(sections[sections.length - 1].kind).toBe("end");
    expect(sections).toHaveLength(DEMO_PANEL_COUNT + 1);
  });
});
