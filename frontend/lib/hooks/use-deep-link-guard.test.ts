/**
 * Wave 0 test scaffold — deep-link guard rule matrix.
 *
 * Tests are it.todo() until Plan 05 implements
 * frontend/lib/hooks/use-deep-link-guard.ts with resolveDeepLinkIntent().
 *
 * Binding behaviors from 05-UI-SPEC.md §"Deep-Link Guard Contract" (D-17)
 * and 05-RESEARCH.md §"Deep-Link Guard (D-17)":
 *
 *   Rule 1 — External entry: empty/external referrer + valid hash → "auto-open"
 *   Rule 2 — Same-origin or reload: same-origin referrer OR perf nav type
 *             "reload" → "show-resume"
 *   Rule 3 — Content mismatch / no chapter: hash past last page or no chapter
 *             loaded → "strip"
 *   Rule 4 — After resume/start-over: replaceState current position (no
 *             history accumulation)
 *
 * Hash grammar (Plan 05, planner-locked): #page=N&panel=M (1-based in URL,
 * 0-based internal — KEEP Phase 4 convention).
 */

// Import is deferred inside test bodies so collection does not error before
// Plan 05 creates the file.
// import { resolveDeepLinkIntent } from "@/lib/hooks/use-deep-link-guard";

import { describe, it } from "vitest";

describe("resolveDeepLinkIntent", () => {
  describe("Rule 1 — external entry (auto-open)", () => {
    it.todo(
      "returns 'auto-open' when referrer is empty and hash is #page=2&panel=3"
      // async () => {
      //   const { resolveDeepLinkIntent } = await import(
      //     "@/lib/hooks/use-deep-link-guard"
      //   );
      //   // Simulate: no referrer, fresh external navigation
      //   Object.defineProperty(document, "referrer", {
      //     get: () => "",
      //     configurable: true,
      //   });
      //   const intent = resolveDeepLinkIntent("#page=2&panel=3");
      //   expect(intent).toBe("auto-open");
      // }
    );

    it.todo(
      "returns 'auto-open' when referrer is an external domain and hash is present"
      // Same as above but with referrer = 'https://example.com'
    );
  });

  describe("Rule 2 — same-origin or reload (show-resume)", () => {
    it.todo(
      "returns 'show-resume' when referrer is the same origin"
      // async () => {
      //   const { resolveDeepLinkIntent } = await import(
      //     "@/lib/hooks/use-deep-link-guard"
      //   );
      //   Object.defineProperty(document, "referrer", {
      //     get: () => window.location.origin + "/",
      //     configurable: true,
      //   });
      //   const intent = resolveDeepLinkIntent("#page=1&panel=1");
      //   expect(intent).toBe("show-resume");
      // }
    );

    it.todo(
      "returns 'show-resume' when performance navigation type is 'reload'"
      // async () => {
      //   const { resolveDeepLinkIntent } = await import(
      //     "@/lib/hooks/use-deep-link-guard"
      //   );
      //   // Mock PerformanceNavigationTiming type = reload
      //   // performance.getEntriesByType("navigation")[0].type === "reload"
      //   const intent = resolveDeepLinkIntent("#page=3&panel=2");
      //   expect(intent).toBe("show-resume");
      // }
    );
  });

  describe("Rule 3 — no chapter / mismatch (strip)", () => {
    it.todo(
      "returns 'strip' when hash references a page beyond the chapter's page count"
      // async () => {
      //   const { resolveDeepLinkIntent } = await import(
      //     "@/lib/hooks/use-deep-link-guard"
      //   );
      //   // pageCount = 5, hash references page=10
      //   const intent = resolveDeepLinkIntent("#page=10&panel=1", { pageCount: 5 });
      //   expect(intent).toBe("strip");
      // }
    );

    it.todo(
      "returns 'strip' when no chapter is loaded (comicUuid is null)"
      // async () => {
      //   const { resolveDeepLinkIntent } = await import(
      //     "@/lib/hooks/use-deep-link-guard"
      //   );
      //   const intent = resolveDeepLinkIntent("#page=1&panel=1", { comicUuid: null });
      //   expect(intent).toBe("strip");
      // }
    );
  });

  describe("Rule 4 — after resume/start-over (replaceState position)", () => {
    it.todo(
      "calls history.replaceState with the current position after resume so the hash reflects actual location"
      // async () => {
      //   const { resolveDeepLinkIntent, consumeDeepLinkIntent } = await import(
      //     "@/lib/hooks/use-deep-link-guard"
      //   );
      //   const replaceSpy = vi.spyOn(window.history, "replaceState");
      //   // After the user clicks RESUME, the hook must replaceState to #page=2&panel=3
      //   consumeDeepLinkIntent({ page: 2, panel: 3 });
      //   expect(replaceSpy).toHaveBeenCalledWith(
      //     null, "", expect.stringMatching(/#page=2&panel=3/)
      //   );
      // }
    );
  });
});
