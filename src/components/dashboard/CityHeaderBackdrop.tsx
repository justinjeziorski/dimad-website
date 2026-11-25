"use client";

import { useEffect, useState } from "react";

type CityHeaderBackdropProps = {
  /** Base layer — previous (or current) photo, always visible */
  currentSrc: string;
  /** Incoming layer — fades in slowly over currentSrc */
  incomingSrc?: string;
  onIncomingLoaded?: (src: string) => void;
  alt?: string;
};

/**
 * Progressive photo layer with crossfade:
 * dark base paints instantly; previous city stays put while the next photo fades in.
 */
export default function CityHeaderBackdrop({
  currentSrc,
  incomingSrc = "",
  onIncomingLoaded,
  alt = ""
}: CityHeaderBackdropProps) {
  const [incomingOpacity, setIncomingOpacity] = useState(0);

  useEffect(() => {
    setIncomingOpacity(0);
    if (!incomingSrc) return;

    let cancelled = false;
    let promoteTimer: number | undefined;
    const img = new Image();

    const finish = () => {
      if (cancelled) return;
      // Slow fade so city switches never feel abrupt.
      requestAnimationFrame(() => {
        if (cancelled) return;
        setIncomingOpacity(1);
      });
      promoteTimer = window.setTimeout(() => {
        if (!cancelled) onIncomingLoaded?.(incomingSrc);
      }, 1100);
    };

    img.onload = finish;
    img.onerror = () => {
      // Still promote so we don't get stuck on the previous city forever.
      if (!cancelled) onIncomingLoaded?.(incomingSrc);
    };
    img.src = incomingSrc;
    // Cached images may already be complete before onload is attached.
    if (img.complete && img.naturalWidth > 0) finish();

    return () => {
      cancelled = true;
      if (promoteTimer) window.clearTimeout(promoteTimer);
      img.onload = null;
      img.onerror = null;
    };
  }, [incomingSrc, onIncomingLoaded]);

  return (
    <>
      {currentSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt={alt}
          width={1200}
          height={675}
          decoding="async"
          fetchPriority="high"
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover object-center scale-[1.01]"
          style={{ opacity: 1 }}
        />
      ) : null}

      {incomingSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={incomingSrc}
          src={incomingSrc}
          alt=""
          width={1200}
          height={675}
          decoding="async"
          fetchPriority="high"
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover object-center scale-[1.01]"
          style={{
            opacity: incomingOpacity,
            transition: "opacity 1.1s ease-in-out",
            willChange: "opacity"
          }}
        />
      ) : null}
    </>
  );
}

export function HeaderPhotoCredit({
  photographerName,
  photographerUrl
}: {
  photographerName?: string;
  photographerUrl?: string;
}) {
  if (!photographerName || !photographerUrl) return null;
  return (
    <div
      style={{
        position: "absolute",
        right: 12,
        bottom: 8,
        zIndex: 20,
        pointerEvents: "auto",
        fontSize: 9,
        lineHeight: 1.3,
        color: "rgba(226,232,240,0.78)",
        textShadow: "0 1px 2px rgba(0,0,0,0.7)",
        maxWidth: "48%",
        textAlign: "right"
      }}
    >
      Photo by{" "}
      <a
        href={photographerUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "rgba(253,230,138,0.92)", textDecoration: "underline" }}
      >
        {photographerName}
      </a>{" "}
      on{" "}
      <a
        href="https://unsplash.com/?utm_source=dimad&utm_medium=referral"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "rgba(253,230,138,0.92)", textDecoration: "underline" }}
      >
        Unsplash
      </a>
    </div>
  );
}
