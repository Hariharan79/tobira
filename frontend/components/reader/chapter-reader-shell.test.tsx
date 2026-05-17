/**
 * Chapter reader shell continuity behaviors (Plan 05).
 *
 * Binding behaviors from 05-RESEARCH.md §Pattern 3 and 05-UI-SPEC.md §D-04/D-05:
 *
 *   D-04 — Cross-page continuity: the flat ChapterSection[] list must be
 *           continuous — last panel of page N immediately precedes first panel
 *           of page N+1 with NO interstitial section between them.
 *
 *   D-05 — Exactly ONE end card: a single ChapterEndCard appears after the
 *           final panel of the last page, never after intermediate pages.
 *
 * ChapterSection shape (Plan 05 contract):
 *   | { kind: "panel"; pageIndex: number; pageUrl: string; panel: ReaderPanel }
 *   | { kind: "detecting"; pageIndex: number }
 *   | { kind: "end" };
 */

import { describe, it, expect } from "vitest";
import { buildChapterSections } from "@/components/reader/chapter-reader-shell";

describe("ChapterReaderShell continuity", () => {
  describe("D-04 — cross-page section list is continuous (no interstitial)", () => {
    it("last panel of page N is immediately followed by first panel of page N+1 with no interstitial section between them", () => {
      const pages = [
        {
          pageIndex: 0,
          pageUrl: "/api/chapter/uuid-1/page/0",
          panels: [
            { n: 0, bbox: [0, 0, 0.5, 0.5], confidence: 0.9 },
            { n: 1, bbox: [0.5, 0, 1, 0.5], confidence: 0.9 },
          ],
        },
        {
          pageIndex: 1,
          pageUrl: "/api/chapter/uuid-1/page/1",
          panels: [
            { n: 0, bbox: [0, 0.5, 0.5, 1], confidence: 0.9 },
            { n: 1, bbox: [0.5, 0.5, 1, 1], confidence: 0.9 },
          ],
        },
      ];

      const sections = buildChapterSections(pages);

      const lastPage0Idx = sections.findLastIndex((s) => s.kind === "panel" && s.pageIndex === 0);
      const firstPage1Section = sections[lastPage0Idx + 1];

      expect(firstPage1Section).toBeDefined();
      expect(firstPage1Section.kind).toBe("panel");
      expect((firstPage1Section as { kind: "panel"; pageIndex: number }).pageIndex).toBe(1);
    });

    it("total section count equals sum of all panels across all pages plus exactly one end section", () => {
      const pages = [
        {
          pageIndex: 0,
          pageUrl: "...",
          panels: [{ n: 0, bbox: [0, 0, 1, 1], confidence: 0.9 }],
        },
        {
          pageIndex: 1,
          pageUrl: "...",
          panels: [
            { n: 0, bbox: [0, 0, 1, 1], confidence: 0.9 },
            { n: 1, bbox: [0, 0, 1, 1], confidence: 0.9 },
          ],
        },
      ];

      const sections = buildChapterSections(pages);
      const panelSections = sections.filter((s) => s.kind === "panel");
      const endSections = sections.filter((s) => s.kind === "end");

      expect(panelSections.length).toBe(3);
      expect(endSections.length).toBe(1);
      expect(sections.length).toBe(4);
    });
  });

  describe("D-05 — exactly one end card after the final page", () => {
    it("exactly ONE end section exists and it is the last section in the flat list", () => {
      const pages = [
        {
          pageIndex: 0,
          pageUrl: "...",
          panels: [{ n: 0, bbox: [0, 0, 1, 1], confidence: 0.9 }],
        },
        {
          pageIndex: 1,
          pageUrl: "...",
          panels: [{ n: 0, bbox: [0, 0, 1, 1], confidence: 0.9 }],
        },
      ];

      const sections = buildChapterSections(pages);
      const endSections = sections.filter((s) => s.kind === "end");

      expect(endSections.length).toBe(1);
      expect(sections[sections.length - 1].kind).toBe("end");
    });

    it("no end section appears between pages (only at the very end)", () => {
      const pages = [
        {
          pageIndex: 0,
          pageUrl: "...",
          panels: [{ n: 0, bbox: [0, 0, 1, 1], confidence: 0.9 }],
        },
        {
          pageIndex: 1,
          pageUrl: "...",
          panels: [{ n: 0, bbox: [0, 0, 1, 1], confidence: 0.9 }],
        },
      ];

      const sections = buildChapterSections(pages);
      sections.forEach((s, i) => {
        if (s.kind === "end") {
          expect(i).toBe(sections.length - 1);
        }
      });
    });
  });
});
