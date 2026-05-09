"use client";

import { useEffect, useState } from "react";
import { DropZone } from "@/components/drop-zone";
import { ImageDisplay } from "@/components/image-display";
import { useUploadPersistence } from "@/lib/hooks/use-persistence";
import { getImageUrl, type UploadResponse } from "@/lib/api";

export default function Home() {
  const { lastUpload, saveUpload, clearUpload, isLoaded } = useUploadPersistence();
  const [currentImage, setCurrentImage] = useState<{ uuid: string; url: string } | null>(null);

  // Restore from localStorage on mount per D-18
  useEffect(() => {
    if (isLoaded && lastUpload) {
      setCurrentImage({
        uuid: lastUpload.uuid,
        url: getImageUrl(lastUpload.uuid),
      });
    }
  }, [isLoaded, lastUpload]);

  const handleUploadSuccess = (data: UploadResponse) => {
    const imageUrl = getImageUrl(data.uuid);
    setCurrentImage({ uuid: data.uuid, url: imageUrl });
    saveUpload({ uuid: data.uuid, url: imageUrl });
  };

  const handleClear = () => {
    setCurrentImage(null);
    clearUpload();
  };

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
        />
      ) : (
        <DropZone onUploadSuccess={handleUploadSuccess} />
      )}
    </main>
  );
}
