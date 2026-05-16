"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { DropZone } from "@/components/drop-zone";
import { ImageDisplay } from "@/components/image-display";
import { ReaderShell, createReaderPage } from "@/components/reader";
import { useUploadPersistence } from "@/lib/hooks/use-persistence";
import { useDetection } from "@/lib/hooks/use-detection";
import { usePanelHash } from "@/lib/hooks/use-panel-hash";
import { useReaderOnboarding } from "@/lib/hooks/use-reader-onboarding";
import { getImageUrl, type UploadResponse } from "@/lib/api";
import type { ReadingDirection } from "@/lib/types";

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
  const { getPanelFromHash, setPanelHash, clearPanelHash } = usePanelHash();
  const { shouldShowOnboarding, markOnboardingSeen } = useReaderOnboarding();

  const runDetection = useCallback(
    (uuid: string) => {
      detect(uuid);
    },
    [detect]
  );

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
    detect(data.uuid);
  };

  const handleClear = () => {
    setCurrentImage(null);
    clearUpload();
    reset();
    setUserDirection(null);
  };

  const handleRedetect = () => {
    if (currentImage) detect(currentImage.uuid);
  };

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

  // Deep link on load: auto-open reader if #panel=N in URL
  useEffect(() => {
    if (!isLoaded || !panels || panels.length === 0) return;
    const hashIndex = getPanelFromHash();
    if (hashIndex !== null && hashIndex < panels.length) {
      setReaderStartIndex(hashIndex);
      setReaderOpen(true);
    }
  }, [isLoaded, panels, getPanelFromHash]);

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

  // Reader page data (memoized — stable identity for ReaderShell props)
  const readerPage = useMemo(
    () =>
      currentImage && panels && panels.length > 0
        ? createReaderPage(currentImage.uuid, currentImage.url, panels, "Comic Page")
        : null,
    [currentImage, panels]
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
            panels={panels}
            isDetecting={isDetecting}
            contentType={contentType}
            errorMessage={error}
            isAmbiguous={ambiguous}
            direction={direction ?? undefined}
            onDirectionChange={handleDirectionChange}
            onClear={handleClear}
            onRedetect={handleRedetect}
            onStartReading={handleStartReading}
          />
        ) : (
          <Landing onUploadSuccess={handleUploadSuccess} />
        )}
      </main>

      {/* Panel-by-Panel Reader (full-viewport takeover) */}
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
    </div>
  );
}

function Landing({ onUploadSuccess }: { onUploadSuccess: (data: UploadResponse) => void }) {
  return (
    <div className="w-full max-w-2xl flex flex-col items-center gap-8 text-center">
      <div className="space-y-3">
        <h1 className="font-sans font-black tracking-tight text-4xl md:text-5xl leading-[1.05]">
          Read comics one panel at a time.
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
          Drop a page. Tobira finds the panels and walks you through them.
        </p>
      </div>
      <DropZone onUploadSuccess={onUploadSuccess} />
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
