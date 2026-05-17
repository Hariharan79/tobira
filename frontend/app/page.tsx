"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { ImageDisplay } from "@/components/image-display";
import { ReaderShell, createReaderPage } from "@/components/reader";
import {
  ChapterReaderShell,
  type ChapterReaderPageInput,
} from "@/components/reader/chapter-reader-shell";
import { Landing } from "@/components/landing";
import { PageProcessing } from "@/components/chapter/page-processing";
import { useUploadPersistence } from "@/lib/hooks/use-persistence";
import { useDetection } from "@/lib/hooks/use-detection";
import { usePanelHash } from "@/lib/hooks/use-panel-hash";
import { useReaderOnboarding } from "@/lib/hooks/use-reader-onboarding";
import { useChapterPersistence } from "@/lib/hooks/use-chapter-persistence";
import { useChapterDetection } from "@/lib/hooks/use-chapter-detection";
import {
  resolveDeepLinkIntent,
  getPositionFromHash,
  commitPosition,
  stripPositionHash,
  type DeepLinkIntent,
} from "@/lib/hooks/use-deep-link-guard";
import {
  getImageUrl,
  getChapterPageImageUrl,
  getChapterStatus,
  getChapterPagePanels,
  type UploadResponse,
} from "@/lib/api";
import type { ChapterUploadResponse, ReadingDirection } from "@/lib/types";

export default function Home() {
  const { lastUpload, saveUpload, clearUpload, isLoaded } = useUploadPersistence();
  const [currentImage, setCurrentImage] = useState<{
    uuid: string;
    url: string;
  } | null>(null);
  const {
    isDetecting,
    panels,
    contentType,
    direction: detectedDirection,
    ambiguous,
    error,
    detect,
    reset,
  } = useDetection();

  // Page-level direction so user override survives re-detection.
  const [userDirection, setUserDirection] = useState<ReadingDirection | null>(null);

  // Effective direction: user override takes precedence over detected
  const direction = userDirection ?? detectedDirection;

  // Reader state — all hooks declared before any return (Rules of Hooks)
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerStartIndex, setReaderStartIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  // Manual reading order (panel ids in order) or null = inferred. Session-only (D-16).
  const [reorderedIds, setReorderedIds] = useState<number[] | null>(null);
  const { getPanelFromHash, setPanelHash, clearPanelHash } = usePanelHash();
  const { shouldShowOnboarding, markOnboardingSeen } = useReaderOnboarding();

  const runDetection = useCallback(
    (uuid: string) => {
      detect(uuid);
    },
    [detect]
  );

  // ── Chapter mode — a PARALLEL state tree (D-03). It does NOT reuse or
  // unify the single-image useUploadPersistence/useDetection/currentImage
  // state above; the single-image path stays behaviorally unchanged. ──
  const {
    lastChapter,
    saveChapter,
    clearChapter,
    isLoaded: chapterLoaded,
  } = useChapterPersistence();
  const [currentChapter, setCurrentChapter] = useState<{
    comicUuid: string;
    pageCount: number;
  } | null>(null);
  const chapterDetection = useChapterDetection(
    currentChapter?.comicUuid ?? null,
    currentChapter?.pageCount ?? 0
  );
  const [chapterReaderOpen, setChapterReaderOpen] = useState(false);
  const [chapterPages, setChapterPages] = useState<ChapterReaderPageInput[]>([]);
  const [chapterStart, setChapterStart] = useState({ page: 0, panel: 0 });

  const [deepLinkIntent, setDeepLinkIntent] = useState<DeepLinkIntent | null>(null);
  const [deepLinkPos, setDeepLinkPos] = useState<{
    page: number;
    panel: number;
  } | null>(null);

  // Chapter restore-once (mirrors the single-image restoredRef guard).
  const chapterRestoredRef = useRef(false);
  useEffect(() => {
    if (!chapterLoaded || chapterRestoredRef.current) return;
    chapterRestoredRef.current = true;
    if (lastChapter) {
      setCurrentChapter({
        comicUuid: lastChapter.comicUuid,
        pageCount: lastChapter.pageCount,
      });
    }
  }, [chapterLoaded, lastChapter]);

  // Stale-404 graceful degrade (Pitfall 3 / D-10 / D-15): the detection hook
  // catches the 404 and surfaces `error` WITHOUT throwing to the console.
  // Clear the stale chapter key and drop back to the upload entry.
  useEffect(() => {
    if (chapterDetection.error && currentChapter) {
      clearChapter();
      setCurrentChapter(null);
      setChapterReaderOpen(false);
      setChapterPages([]);
    }
  }, [chapterDetection.error, currentChapter, clearChapter]);

  // Build the reader's per-page input from chapter status (panels + url).
  useEffect(() => {
    const uuid = currentChapter?.comicUuid;
    if (!uuid) {
      setChapterPages([]);
      return;
    }
    let cancelled = false;
    getChapterStatus(uuid)
      .then((status) => {
        if (cancelled) return;
        setChapterPages(
          status.pages.map((p) => ({
            pageIndex: p.page,
            pageUrl: getChapterPageImageUrl(uuid, p.page),
            panels: p.status === "done" ? p.panels : null,
          }))
        );
      })
      .catch(() => {
        /* 404 handled by the detection hook's error path (no console err) */
      });
    return () => {
      cancelled = true;
    };
  }, [currentChapter, chapterDetection.doneCount, chapterDetection.allDone]);

  // D-09 catch-up: fetch a not-yet-detected page's panels on demand.
  const handleRequestPage = useCallback(
    (pageIndex: number) => {
      const uuid = currentChapter?.comicUuid;
      if (!uuid) return;
      getChapterPagePanels(uuid, pageIndex)
        .then((res) => {
          if (res.status !== "done") return;
          setChapterPages((prev) =>
            prev.map((pg) => (pg.pageIndex === pageIndex ? { ...pg, panels: res.panels } : pg))
          );
        })
        .catch(() => {
          /* transient — the SSE/poll loop will deliver it */
        });
    },
    [currentChapter]
  );

  const handleChapterSuccess = useCallback(
    (data: ChapterUploadResponse) => {
      setCurrentChapter({
        comicUuid: data.comic_uuid,
        pageCount: data.page_count,
      });
      saveChapter({
        comicUuid: data.comic_uuid,
        pageCount: data.page_count,
      });
      setChapterReaderOpen(false);
    },
    [saveChapter]
  );

  const handleChapterStart = useCallback(() => {
    setChapterStart({ page: 0, panel: 0 });
    setChapterReaderOpen(true);
  }, []);

  const handleChapterCancel = useCallback(() => {
    clearChapter();
    setCurrentChapter(null);
    setChapterReaderOpen(false);
    setChapterPages([]);
    chapterDetection.reset();
  }, [clearChapter, chapterDetection]);

  const handleChapterClose = useCallback(() => {
    setChapterReaderOpen(false);
  }, []);

  // Deep-link guard (D-17): replaces the deleted aggressive auto-open effect.
  // Resolve once the chapter context is known: external/shared → auto-open
  // at the hashed position; reload/internal → ResumeBanner on Landing (NOT
  // auto-open); mismatch → strip the hash silently.
  useEffect(() => {
    if (typeof window === "undefined" || !currentChapter) return;
    const intent = resolveDeepLinkIntent(window.location.hash, {
      pageCount: currentChapter.pageCount,
      comicUuid: currentChapter.comicUuid,
    });
    setDeepLinkIntent(intent);
    if (intent === "strip") {
      stripPositionHash();
      setDeepLinkPos(null);
    } else {
      setDeepLinkPos(getPositionFromHash());
    }
  }, [currentChapter]);

  const guardHandledRef = useRef(false);
  useEffect(() => {
    if (guardHandledRef.current) return;
    if (!currentChapter || chapterPages.length === 0) return;
    if (deepLinkIntent === "auto-open" && deepLinkPos) {
      guardHandledRef.current = true;
      setChapterStart(deepLinkPos);
      setChapterReaderOpen(true);
    }
  }, [deepLinkIntent, deepLinkPos, currentChapter, chapterPages]);

  const handleResume = useCallback(() => {
    const pos = deepLinkPos ?? getPositionFromHash() ?? { page: 0, panel: 0 };
    commitPosition(pos.page, pos.panel);
    setChapterStart(pos);
    setChapterReaderOpen(true);
  }, [deepLinkPos]);

  const handleResumeDismiss = useCallback(() => {
    stripPositionHash();
    setDeepLinkIntent("strip");
  }, []);

  // Restore from localStorage exactly once after persistence hydrates.
  // Without the ref, saveUpload() inside handleUploadSuccess re-fires this
  // effect and triggers a duplicate /api/detect call.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || restoredRef.current) return;
    restoredRef.current = true;
    if (lastUpload) {
      setCurrentImage({
        uuid: lastUpload.uuid,
        url: getImageUrl(lastUpload.uuid),
      });
      runDetection(lastUpload.uuid);
    }
  }, [isLoaded, lastUpload, runDetection]);

  // Mobile viewport detection for compact minimap
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleUploadSuccess = (data: UploadResponse) => {
    const url = getImageUrl(data.uuid);
    setCurrentImage({ uuid: data.uuid, url });
    saveUpload({ uuid: data.uuid, url });
    setUserDirection(null);
    setReorderedIds(null); // fresh page → inferred order
    detect(data.uuid);
  };

  const handleClear = () => {
    setCurrentImage(null);
    clearUpload();
    reset();
    setUserDirection(null);
    setReorderedIds(null);
  };

  const handleRedetect = () => {
    if (currentImage) {
      setReorderedIds(null); // re-detection invalidates a manual order
      detect(currentImage.uuid);
    }
  };

  const handleReorder = useCallback((ids: number[] | null) => {
    setReorderedIds(ids);
  }, []);

  const handleStartReading = useCallback(() => {
    if (!panels || panels.length === 0) {
      toast.error("No panels to read", {
        description: "Please wait for panel detection to complete.",
      });
      return;
    }

    // Deep-link support: honor #panel=N if present
    const hashIndex = getPanelFromHash();
    const startIndex = hashIndex !== null && hashIndex < panels.length ? hashIndex : 0;

    setReaderStartIndex(startIndex);
    setReaderOpen(true);

    if (shouldShowOnboarding) markOnboardingSeen();
  }, [panels, getPanelFromHash, shouldShowOnboarding, markOnboardingSeen]);

  const handleReaderClose = useCallback(() => {
    setReaderOpen(false);
    clearPanelHash();
  }, [clearPanelHash]);

  const handlePanelChange = useCallback(
    (index: number) => {
      setPanelHash(index);
    },
    [setPanelHash]
  );

  // D-17: the aggressive "auto-open the reader on every load from a stale
  // #panel hash" effect that used to live here is intentionally REMOVED.
  // Single-image deep-links still work via handleStartReading (button), and
  // chapter deep-links go through the use-deep-link-guard rules above.

  // Handle direction toggle - re-fetch with new direction per D-05
  const handleDirectionChange = useCallback(
    (newDirection: ReadingDirection) => {
      setUserDirection(newDirection);
      if (currentImage) {
        // Re-fetch with new direction per D-05
        detect(currentImage.uuid, { direction: newDirection });
      }
    },
    [currentImage, detect]
  );

  // Effective panel order: manual reorder (if applied) overrides inferred.
  const orderedPanels = useMemo(() => {
    if (!panels) return panels;
    if (!reorderedIds) return panels;
    const byId = new Map(panels.map((p) => [p.id, p]));
    const reordered = reorderedIds
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => p != null);
    // Fall back to inferred if the saved order is stale (panel set changed)
    return reordered.length === panels.length ? reordered : panels;
  }, [panels, reorderedIds]);

  // Reader page data (memoized — stable identity for ReaderShell props)
  const readerPage = useMemo(
    () =>
      currentImage && orderedPanels && orderedPanels.length > 0
        ? createReaderPage(currentImage.uuid, currentImage.url, orderedPanels, "Comic Page")
        : null,
    [currentImage, orderedPanels]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full max-w-5xl mx-auto px-4 md:px-6 pt-4">
        <SiteHeader />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center gap-8 px-4 md:px-6 py-8">
        {!isLoaded ? (
          <Hydrating />
        ) : currentImage ? (
          <ImageDisplay
            src={currentImage.url}
            panels={orderedPanels}
            isDetecting={isDetecting}
            contentType={contentType}
            errorMessage={error}
            isAmbiguous={ambiguous}
            direction={direction ?? undefined}
            onDirectionChange={handleDirectionChange}
            onClear={handleClear}
            onRedetect={handleRedetect}
            onStartReading={handleStartReading}
            onReorder={handleReorder}
            isReordered={reorderedIds != null}
          />
        ) : currentChapter ? null : (
          <Landing
            onSingleSuccess={handleUploadSuccess}
            onChapterSuccess={handleChapterSuccess}
            showResume={deepLinkIntent === "show-resume"}
            resumePageN={(deepLinkPos?.page ?? 0) + 1}
            resumePanelN={(deepLinkPos?.panel ?? 0) + 1}
            onResume={handleResume}
            onResumeDismiss={handleResumeDismiss}
            mobile={isMobile}
          />
        )}
      </main>

      {/* Single-image Panel-by-Panel Reader (full-viewport takeover) */}
      {readerOpen && readerPage && (
        <ReaderShell
          page={readerPage}
          startAt={readerStartIndex}
          theme="dark"
          mobile={isMobile}
          onClose={handleReaderClose}
          onPanelChange={handlePanelChange}
          showOnboarding={shouldShowOnboarding}
        />
      )}

      {/* Chapter processing takeover (upload → per-page progress → start) */}
      {currentChapter && !chapterReaderOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900 }}>
          <PageProcessing
            theme="light"
            mobile={isMobile}
            pageCount={currentChapter.pageCount}
            pages={chapterDetection.pages}
            doneCount={chapterDetection.doneCount}
            page1Ready={chapterDetection.page1Ready}
            allDone={chapterDetection.allDone}
            onCancel={handleChapterCancel}
            onStart={handleChapterStart}
          />
        </div>
      )}

      {/* Continuous cross-page chapter reader (full-viewport takeover) */}
      {chapterReaderOpen && currentChapter && chapterPages.length > 0 && (
        <ChapterReaderShell
          pages={chapterPages}
          totalPages={currentChapter.pageCount}
          theme="dark"
          mobile={isMobile}
          startPage={chapterStart.page}
          startPanel={chapterStart.panel}
          onClose={handleChapterClose}
          onRequestPage={handleRequestPage}
        />
      )}
    </div>
  );
}

function Hydrating() {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      Loading…
    </p>
  );
}
