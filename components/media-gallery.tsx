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
  const [loadedIds, setLoadedIds] = useState<Record<string, true>>({});
  const [failedIds, setFailedIds] = useState<Record<string, true>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const lightboxItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = galleryRef.current;
    if (!root) return;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );

    const raf = window.requestAnimationFrame(() => {
      nodes.forEach((node) => {
        if (!node.classList.contains("is-visible")) {
          observer.observe(node);
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [items.length]);

  useEffect(() => {
    if (lightboxIndex === null) {
      // Restore scroll position when lightbox closes
      window.scrollTo(0, scrollY);
      return;
    }
    setScrollY(window.scrollY);
    document.body.style.overflow = 'hidden';
    
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
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, items.length, scrollY]);

  // Scroll the clicked image into view when the lightbox opens (mobile horizontal scroll).
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
          const downloadVisibilityClass = isLoaded
            ? "opacity-100 pointer-events-auto md:opacity-0 md:pointer-events-none md:group-hover:pointer-events-auto md:group-hover:opacity-100"
            : "opacity-0 pointer-events-none";
          const prioritized = index < 6;

          return (
            <div
              key={item.id}
              className="mb-4 break-inside-avoid"
            >
              <article
                className={`interactive-surface group relative overflow-hidden rounded-xl transition-all ${
                  isLoaded
                    ? "cursor-pointer border border-neutral-border bg-neutral-dark/40 hover:border-primary/30 hover:bg-neutral-dark"
                    : "border border-transparent bg-transparent"
                }`}
                data-proximity
                data-proximity-strength="2.1"
                onClick={() => isLoaded && !hasFailed && setLightboxIndex(index)}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              >
                {!isLoaded ? <div className="absolute inset-0 animate-pulse bg-neutral-dark/70" /> : null}
                <div className="relative select-none">
                  <Image
                    src={item.viewUrl}
                    alt={item.title || `Gallery image ${index + 1}`}
                    width={1600}
                    height={1200}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    loading={prioritized ? "eager" : "lazy"}
                    fetchPriority={prioritized ? "high" : "auto"}
                    onLoad={() => {
                      setLoadedIds((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }));
                    }}
                    onError={() => {
                      setFailedIds((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }));
                      setLoadedIds((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }));
                    }}
                    className={`block h-auto w-full object-cover transition-opacity duration-300 ${imageBackgroundClassName} ${isLoaded ? "opacity-100" : "opacity-0"}`}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>
                {item.title && isLoaded && !hasFailed ? (
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-neutral-200">{item.title}</p>
                  </div>
                ) : null}

                {hasFailed ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-dark/85 p-4 text-center">
                    <p className="text-sm text-neutral-100">Images failed to load.</p>
                    <a
                      href="https://denandras.ddns.net/index.php/s/press"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-neutral-100 transition-colors hover:bg-primary/20"
                    >
                      Open Press Gallery
                    </a>
                  </div>
                ) : null}

                {!hasFailed && showDownload ? (
                  <a
                    href={item.downloadUrl}
                    onClick={(event) => event.stopPropagation()}
                    className={`absolute top-3 right-3 inline-flex items-center justify-center rounded-lg border border-primary/30 bg-background-dark/70 p-2.5 text-neutral-100 backdrop-blur-sm transition-all duration-200 hover:bg-background-dark/85 ${downloadVisibilityClass}`}
                    aria-label="Download image"
                    title="Download"
                  >
                    <IconDownload className="size-4 text-primary" />
                  </a>
                ) : null}
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
            {/* Mobile: render all items for scroll, Desktop: render only current */}
            {items.map((item, idx) => {
              const isCurrent = idx === lightboxIndex;
              const isLoaded = !!loadedIds[item.id];
              const hasFailed = !!failedIds[item.id];
              
              // On desktop, only render current image
              if (typeof window !== 'undefined' && window.innerWidth >= 768 && !isCurrent) {
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
                        onLoad={() => setLoadedIds((prev) => (prev[item.id] ? prev : { ...prev, [item.id] : true }))}
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
