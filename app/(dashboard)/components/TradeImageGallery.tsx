"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, X } from "lucide-react";

interface TradeImageGalleryProps {
  urls: string[];
}

export default function TradeImageGallery({ urls }: TradeImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);

  const showNext = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? current : (current + 1) % urls.length
    );
  }, [urls.length]);

  const showPrevious = useCallback(() => {
    setActiveIndex((current) =>
      current === null
        ? current
        : (current - 1 + urls.length) % urls.length
    );
  }, [urls.length]);

  useEffect(() => {
    if (activeIndex === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") showNext();
      if (event.key === "ArrowLeft") showPrevious();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, close, showNext, showPrevious]);

  if (urls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#303236] bg-[#131516] px-6 py-10 text-center">
        <Camera size={20} className="text-[#77797C]" />
        <p className="mt-3 text-sm font-medium text-white">
          No screenshots attached
        </p>
        <p className="mt-1 max-w-xs text-xs text-[#77797C]">
          This trade doesn&apos;t have any chart screenshots yet.
        </p>
      </div>
    );
  }

  const activeUrl = activeIndex === null ? null : urls[activeIndex];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {urls.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`View screenshot ${index + 1} larger`}
            className="group relative aspect-video overflow-hidden rounded-lg border border-[#303236] bg-[#131516] transition hover:border-[#A7A9AC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A7A9AC]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Trade screenshot ${index + 1}`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {activeUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Trade screenshot viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close viewer"
            className="absolute right-4 top-4 rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X size={22} />
          </button>

          {urls.length > 1 && (
            <>
              <button
                type="button"
                onClick={showPrevious}
                aria-label="Previous screenshot"
                className="absolute left-3 rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white sm:left-6"
              >
                <ChevronLeft size={26} />
              </button>

              <button
                type="button"
                onClick={showNext}
                aria-label="Next screenshot"
                className="absolute right-3 rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white sm:right-6"
              >
                <ChevronRight size={26} />
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeUrl}
            alt={`Trade screenshot ${(activeIndex ?? 0) + 1}`}
            className="max-h-full max-w-full rounded-lg object-contain"
          />

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">
            {(activeIndex ?? 0) + 1} / {urls.length}
          </p>
        </div>
      )}
    </>
  );
}
