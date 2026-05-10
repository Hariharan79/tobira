"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { DropZone } from "@/components/drop-zone";
import { ImageDisplay } from "@/components/image-display";
import { useUploadPersistence } from "@/lib/hooks/use-persistence";
import { useDetection } from "@/lib/hooks/use-detection";
import { getImageUrl, type UploadResponse } from "@/lib/api";
import type { ReadingDirection } from "@/lib/types";

export default function Home() {
  const { lastUpload, saveUpload, clearUpload, isLoaded } = useUploadPersistence();
  const [currentImage, setCurrentImage] = useState<{ uuid: string; url: string } | null>(null);
  const { isDetecting, panels, contentType, direction, ambiguous, detect, reset } = useDetection();

  // Memoize detect to avoid triggering useEffect dependency warnings
  const runDetection = useCallback(
    (uuid: string) => {
      detect(uuid);
    },
    [detect]
  );

  // Restore from localStorage on mount per D-18
  // Auto-detect on restore if we have a saved upload
  useEffect(() => {
    if (isLoaded && lastUpload) {
      setCurrentImage({
        uuid: lastUpload.uuid,
        url: getImageUrl(lastUpload.uuid),
      });
      // Auto-detect on restore
      runDetection(lastUpload.uuid);
    }
  }, [isLoaded, lastUpload, runDetection]);

  const handleUploadSuccess = (data: UploadResponse) => {
    const imageUrl = getImageUrl(data.uuid);
    setCurrentImage({ uuid: data.uuid, url: imageUrl });
    saveUpload({ uuid: data.uuid, url: imageUrl });

    // Auto-detect on upload (per D-03: eager detection)
    detect(data.uuid);
  };

  const handleClear = () => {
    setCurrentImage(null);
    clearUpload();
    reset(); // Clear detection state
  };

  const handleRedetect = () => {
    if (currentImage) {
      detect(currentImage.uuid);
    }
  };

  const handleStartReading = () => {
    // Phase 4 will implement the TikTok-style reader
    // For now, show a toast indicating feature is coming
    toast.info("Reader coming in Phase 4", {
      description: "Panel-by-panel reading will be available soon!",
    });
  };

  // Handle direction toggle - re-fetch with new direction per D-05
  const handleDirectionChange = useCallback(
    (newDirection: ReadingDirection) => {
      if (currentImage) {
        // Re-fetch with new direction per D-05
        detect(currentImage.uuid, { direction: newDirection });
      }
    },
    [currentImage, detect]
  );

  // Don't render until persistence is loaded to avoid hydration mismatch
  if (!isLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-4 md:p-8">
      {currentImage ? (
        <ImageDisplay
          src={currentImage.url}
          onClear={handleClear}
          panels={panels}
          isDetecting={isDetecting}
          onRedetect={handleRedetect}
          onStartReading={handleStartReading}
          contentType={contentType}
          direction={direction}
          ambiguous={ambiguous}
          onDirectionChange={handleDirectionChange}
        />
      ) : (
        <DropZone onUploadSuccess={handleUploadSuccess} />
      )}
    </main>
  );
}
