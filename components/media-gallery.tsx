"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconDownload } from "@/components/icons";

type MediaItem = {
  id: string;
  title?: string;
  viewUrl: string;
  downloadUrl: string;
};

export default function MediaGallery({
  items,
  showDownload = true,
  imageBackgroundClassName = "",
}: {
  items: MediaItem[];
  showDownload?: boolean;
  imageBackgroundClassName?: string;
}) {
  const [loadedIds, setLoadedIds] = useState<Record<string, boolean>>({});
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});
  const [visibleIds, setVisibleIds] = useState<Record<string, boolean>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const lightboxItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track which items have entered the viewport (for lazy loading trigger)
  useEffect(() => {
    if (!items.length) return;
    const root = galleryRef.current;
    if (!root) return;

    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-card-id]"));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-card-id");
            if (id) {
              setVisibleIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
            }
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "200px 0px", threshold: 0 },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [items.length]);

  // Lightbox: lock scroll, handle keyboard
  useEffect(() => {
    if (lightboxIndex === null) {
      window.scrollTo(0, scrollY);
      return;
    }
    setScrollY(window.scrollY);
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxIndex(null);
      } else if (event.key === "ArrowLeft" && lightboxIndex !== null && lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1);
      } else if (event.key === "ArrowRight" && lightboxIndex !== null && lightboxIndex < items.length - 1) {
        setLightboxIndex(lightboxIndex + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, items.length, scrollY]);

  // Scroll the clicked image into view when the lightbox opens (mobile horizontal scroll)
  useEffect(() => {
    if (lightboxIndex === null) return;
    const node = lightboxItemRefs.current[lightboxIndex];
    if (node) {
      node.scrollIntoView({ behavior: "instant" as ScrollBehavior, inline: "center", block: "center" });
    }
  }, [lightboxIndex]);

  return (
    <>
      <div ref={galleryRef} className="relative z-10 columns-1 gap-4 sm:columns-[280px] md:columns-[320px] lg:columns-[350px]">
        {items.map((item, index) => {
          const isLoaded = !!loadedIds[item.id];
          const hasFailed = !!failedIds[item.id];
          const isVisible = !!visibleIds[item.id] || index < 6;
          const prioritized = index < 6;

          return (
            <div key={item.id} data-card-id={item.id} className="mb-4 break-inside-avoid">
              <article
                className="group relative overflow-hidden rounded-xl border border-neutral-border bg-neutral-dark/40"
                onClick={() => isLoaded && !hasFailed && setLightboxIndex(index)}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                style={{ cursor: isLoaded && !hasFailed ? "pointer" : "default" }}
              >
                {/* Placeholder — always visible, fixed aspect ratio */}
                {!isLoaded && !hasFailed && (
                  <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
                    <div className="absolute inset-0 animate-pulse bg-neutral-dark/70" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isVisible ? (
                        <svg className="h-6 w-6 animate-spin text-primary/30" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="h-8 w-8 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.257a3 3 0 0 1 4.311 0l5.18 5.26M3 19.5h18M3 19.5V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25V19.5" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}

                {/* Failed state */}
                {hasFailed && (
                  <div className="relative flex w-full items-center justify-center bg-neutral-dark/60" style={{ aspectRatio: "4 / 3" }}>
                    <p className="text-sm text-neutral-500">Image failed to load.</p>
                  </div>
                )}

                {/* Hidden loader img — fires onLoad, then we promote */}
                {isVisible && !isLoaded && !hasFailed && (
                  <img
                    src={item.viewUrl}
                    alt=""
                    className="hidden"
                    onLoad={() => setLoadedIds((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }))}
                    onError={() => setFailedIds((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }))}
                  />
                )}

                {/* Loaded image — fade in */}
                {isLoaded && !hasFailed && (
                  <>
                    <div className="relative select-none">
                      <Image
                        src={item.viewUrl}
                        alt={item.title || `Gallery image ${index + 1}`}
                        width={800}
                        height={600}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        quality={70}
                        loading={prioritized ? "eager" : "lazy"}
                        className={`gallery-img-reveal block h-auto w-full object-cover ${imageBackgroundClassName}`}
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                    {item.title && (
                      <div className="px-4 py-3">
                        <p className="text-sm font-medium text-neutral-200">{item.title}</p>
                      </div>
                    )}
                    {showDownload && (
                      <a
                        href={item.downloadUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-3 right-3 inline-flex items-center justify-center rounded-lg border border-primary/30 bg-background-dark/70 p-2.5 text-neutral-100 backdrop-blur-sm transition-all duration-200 hover:bg-background-dark/85 opacity-0 pointer-events-none md:group-hover:pointer-events-auto md:group-hover:opacity-100 max-md:opacity-100 max-md:pointer-events-auto"
                        aria-label="Download image"
                        title="Download"
                      >
                        <IconDownload className="size-4 text-primary" />
                      </a>
                    )}
                  </>
                )}
              </article>
            </div>
          );
        })}
      </div>

      {mounted && lightboxIndex !== null && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
          onClick={() => setLightboxIndex(null)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Mobile: Horizontal scrollable gallery, Desktop: Single image with arrows */}
          <div
            className="flex gap-4 overflow-x-auto overflow-y-hidden px-4 py-8 snap-x snap-mandatory scroll-smooth md:overflow-hidden md:snap-none md:scroll-auto"
            style={{ maxWidth: "100vw", maxHeight: "100vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, idx) => {
              const isCurrent = idx === lightboxIndex;
              const isLoaded = !!loadedIds[item.id];
              const hasFailed = !!failedIds[item.id];

              // On desktop, only render current image
              if (typeof window !== "undefined" && window.innerWidth >= 768 && !isCurrent) {
                return null;
              }

              return (
                <div
                  key={item.id}
                  ref={(el) => { lightboxItemRefs.current[idx] = el; }}
                  className="flex-shrink-0 snap-center flex items-center justify-center md:flex-shrink md:snap-start"
                  style={{ minWidth: "85vw", maxWidth: "90vw" }}
                >
                  <div className="relative overflow-hidden rounded-xl select-none">
                    {!isLoaded && !hasFailed && <div className="absolute inset-0 animate-pulse bg-neutral-dark/70 rounded-xl" />}
                    {hasFailed ? (
                      <div className="flex h-[70dvh] w-[80vw] max-w-[800px] flex-col items-center justify-center gap-3 bg-neutral-dark/85 p-4 text-center rounded-xl">
                        <p className="text-sm text-neutral-100">Image failed to load</p>
                      </div>
                    ) : (
                      <Image
                        src={item.viewUrl}
                        alt={item.title || `Gallery image ${idx + 1}`}
                        width={1600}
                        height={1200}
                        sizes="90vw"
                        unoptimized
                        onLoad={() => setLoadedIds((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }))}
                        className={`h-auto max-h-[85dvh] w-auto max-w-[90vw] object-contain transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
                        style={{ borderRadius: "0.75rem", background: isLoaded ? "white" : "transparent" }}
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    )}
                    {item.title && isLoaded && !hasFailed && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 rounded-b-xl">
                        <p className="text-sm font-medium text-white text-center">{item.title}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-[110] flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close preview"
          >
            ×
          </button>

          {/* Download button */}
          {(() => {
            const current = items[lightboxIndex];
            if (!current) return null;
            return (
              <a
                href={current.downloadUrl}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-4 right-16 z-[110] flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Download image"
                title="Download"
              >
                <IconDownload className="size-5" />
              </a>
            );
          })()}

          {/* Navigation arrows */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 z-[110] flex size-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
              }}
              aria-label="Previous image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {lightboxIndex < items.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 z-[110] flex size-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev !== null && prev < items.length - 1 ? prev + 1 : prev));
              }}
              aria-label="Next image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}

          {/* Image counter for desktop */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[110] hidden md:block rounded-full bg-black/50 px-3 py-1.5 text-sm text-white">
            {lightboxIndex + 1} / {items.length}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}