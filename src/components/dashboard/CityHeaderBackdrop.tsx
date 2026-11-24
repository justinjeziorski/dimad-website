"use client";

import { useEffect, useState } from "react";

type CityHeaderBackdropProps = {
  src: string;
  alt?: string;
};

/**
 * Progressive photo layer: dark base paints instantly; image fades in when ready.
 * Uses high fetch priority so Cache API / HTTP cache hits are prioritized.
 */
export default function CityHeaderBackdrop({ src, alt = "" }: CityHeaderBackdropProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob: Cache API URLs; next/image cannot use object URLs
    <img
      src={src}
      alt={alt}
      width={1200}
      height={675}
      decoding="async"
      fetchPriority="high"
      sizes="100vw"
      onLoad={() => setLoaded(true)}
      className="absolute inset-0 h-full w-full object-cover object-center scale-[1.01] transition-opacity duration-700 ease-out"
      style={{ opacity: loaded ? 1 : 0 }}
    />
  );
}
