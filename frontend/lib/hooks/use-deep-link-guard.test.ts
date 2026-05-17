/**
 * Deep-link guard rule matrix (Plan 05 — D-17).
 *
 * Binding behaviors from 05-UI-SPEC.md §"Deep-Link Guard Contract" and
 * 05-RESEARCH.md §"Deep-Link Guard (D-17)":
 *
 *   Rule 1 — External entry: empty/external referrer + valid hash → "auto-open"
 *   Rule 2 — Same-origin or reload: same-origin referrer OR perf nav type
 *             "reload" → "show-resume"
 *   Rule 3 — Content mismatch / no chapter: hash past last page or no chapter
 *             loaded → "strip"
 *   Rule 4 — After resume/start-over: replaceState current position (no
 *             history accumulation)
 *
 * Hash grammar: #page=N&panel=M (1-based in URL, 0-based internal).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeDeepLinkIntent, resolveDeepLinkIntent } from "@/lib/hooks/use-deep-link-guard";

function setReferrer(value: string) {
  Object.defineProperty(document, "referrer", {
    get: () => value,
    configurable: true,
  });
}

function mockNavType(type: "navigate" | "reload") {
  vi.spyOn(performance, "getEntriesByType").mockImplementation(((entryType: string) =>
    entryType === "navigation"
      ? [{ type } as PerformanceNavigationTiming]
      : []) as typeof performance.getEntriesByType);
}

afterEach(() => {
  vi.restoreAllMocks();
  setReferrer("");
  try {
    window.sessionStorage.clear();
  } catch {
    /* ignore */
  }
});

describe("resolveDeepLinkIntent", () => {
  describe("Rule 1 — external entry (auto-open)", () => {
    it("returns 'auto-open' when referrer is empty and hash is #page=2&panel=3", () => {
      setReferrer("");
      mockNavType("navigate");
      expect(resolveDeepLinkIntent("#page=2&panel=3")).toBe("auto-open");
    });

    it("returns 'auto-open' when referrer is an external domain and hash is present", () => {
      setReferrer("https://example.com");
      mockNavType("navigate");
      expect(resolveDeepLinkIntent("#page=2&panel=3")).toBe("auto-open");
    });
  });

  describe("Rule 2 — same-origin or reload (show-resume)", () => {
    it("returns 'show-resume' when referrer is the same origin", () => {
      setReferrer(window.location.origin + "/");
      mockNavType("navigate");
      expect(resolveDeepLinkIntent("#page=1&panel=1")).toBe("show-resume");
    });

    it("returns 'show-resume' when performance navigation type is 'reload'", () => {
      setReferrer("");
      mockNavType("reload");
      expect(resolveDeepLinkIntent("#page=3&panel=2")).toBe("show-resume");
    });
  });

  describe("Rule 3 — no chapter / mismatch (strip)", () => {
    it("returns 'strip' when hash references a page beyond the chapter's page count", () => {
      setReferrer("");
      mockNavType("navigate");
      expect(resolveDeepLinkIntent("#page=10&panel=1", { pageCount: 5 })).toBe("strip");
    });

    it("returns 'strip' when no chapter is loaded (comicUuid is null)", () => {
      setReferrer("");
      mockNavType("navigate");
      expect(resolveDeepLinkIntent("#page=1&panel=1", { comicUuid: null })).toBe("strip");
    });
  });

  describe("Rule 4 — after resume/start-over (replaceState position)", () => {
    it("calls history.replaceState with the current position after resume so the hash reflects actual location", () => {
      const replaceSpy = vi.spyOn(window.history, "replaceState");
      consumeDeepLinkIntent({ page: 2, panel: 3 });
      expect(replaceSpy).toHaveBeenCalledWith(null, "", expect.stringMatching(/#page=2&panel=3/));
    });
  });
});
