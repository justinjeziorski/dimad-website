"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeCityKey } from "@/lib/location/locationResolver";
import { toLightweightBackdropUrl } from "@/lib/city/backdropCache";

type WorldClockDiscProps = {
  city: string;
  tz: string;
  utcLabel?: string;
  size?: number;
  /** stack = face + labels below; inline = face + meta beside (header strip) */
  variant?: "stack" | "inline";
};

const LOCAL_HEROES: Record<string, string> = {
  yerevan: "/assets/yerevan-clock-hero.jpg",
  london: "/assets/london-clock-hero.jpg",
  "new-york": "/assets/new-york-clock-hero.jpg"
};

const imageMemory = new Map<string, string>();
const imageInflight = new Map<string, Promise<string | null>>();

async function resolveCityHero(city: string): Promise<string | null> {
  const key = normalizeCityKey(city);
  if (!key) return null;
  if (imageMemory.has(key)) return imageMemory.get(key) || null;
  const pending = imageInflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch(`/api/city-image?city=${encodeURIComponent(city)}`, {
        credentials: "same-origin"
      });
      if (res.ok) {
        const data = (await res.json()) as { imageUrl?: string | null; notFound?: boolean };
        if (data.imageUrl && !data.notFound) {
          const url = toLightweightBackdropUrl(String(data.imageUrl));
          imageMemory.set(key, url);
          return url;
        }
      }
    } catch {
      /* fall through */
    }
    const local = LOCAL_HEROES[key];
    if (local) {
      imageMemory.set(key, local);
      return local;
    }
    return null;
  })().finally(() => {
    imageInflight.delete(key);
  });

  imageInflight.set(key, promise);
  return promise;
}

function partsInZone(now: Date, tz: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    }).formatToParts(now);
    const num = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
    return { hour: num("hour") % 24, minute: num("minute"), second: num("second") };
  } catch {
    return { hour: 0, minute: 0, second: 0 };
  }
}

function shortCityLabel(city: string) {
  const raw = String(city || "").trim();
  if (raw.length <= 9) return raw.toUpperCase();
  return `${raw.slice(0, 7).toUpperCase()}…`;
}

/**
 * Compact circular world-clock face with Unsplash/local hero backdrop + analog hands.
 */
export default function WorldClockDisc({
  city,
  tz,
  utcLabel,
  size = 44,
  variant = "inline"
}: WorldClockDiscProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(() => LOCAL_HEROES[normalizeCityKey(city)] || null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void resolveCityHero(city).then((url) => {
      if (!cancelled && url) setBgUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [city]);

  const hands = useMemo(() => {
    if (!now) return { h: 0, m: 0, s: 0, digital: "--:--" };
    const p = partsInZone(now, tz);
    const hAng = (p.hour % 12) * 30 + p.minute * 0.5 + p.second * (0.5 / 60);
    const mAng = p.minute * 6 + p.second * 0.1;
    const sAng = p.second * 6;
    const digital = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(now);
    return { h: hAng, m: mAng, s: sAng, digital };
  }, [now, tz]);

  const ticks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const outer = 22.5;
        const inner = i % 3 === 0 ? 17.5 : 19.5;
        return {
          key: i,
          x1: 24 + Math.sin(a) * inner,
          y1: 24 - Math.cos(a) * inner,
          x2: 24 + Math.sin(a) * outer,
          y2: 24 - Math.cos(a) * outer,
          major: i % 3 === 0
        };
      }),
    []
  );

  const face = (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "999px",
        overflow: "hidden",
        border: "1.5px solid rgba(251, 191, 36, 0.45)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.3)",
        background: "#0d121d",
        flexShrink: 0
      }}
    >
      {bgUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bgUrl}
          alt=""
          width={size}
          height={size}
          decoding="async"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      ) : null}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 40%, rgba(8,12,22,0.3) 0%, rgba(8,12,22,0.78) 72%, rgba(8,12,22,0.9) 100%)"
        }}
      />
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, color: "rgba(248,250,252,0.85)" }}
      >
        <circle
          cx="24"
          cy="24"
          r="22.5"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
        {ticks.map((t) => (
          <line
            key={t.key}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="currentColor"
            strokeOpacity={t.major ? 0.9 : 0.4}
            strokeWidth={t.major ? 1.5 : 1}
            strokeLinecap="round"
          />
        ))}
        <line
          x1="24"
          y1="24"
          x2="24"
          y2="14"
          stroke="#fbbf24"
          strokeWidth="2.2"
          strokeLinecap="round"
          transform={`rotate(${hands.h} 24 24)`}
        />
        <line
          x1="24"
          y1="24"
          x2="24"
          y2="11"
          stroke="#f8fafc"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${hands.m} 24 24)`}
        />
        <line
          x1="24"
          y1="26"
          x2="24"
          y2="9"
          stroke="rgba(251,191,36,0.75)"
          strokeWidth="0.9"
          strokeLinecap="round"
          transform={`rotate(${hands.s} 24 24)`}
        />
        <circle cx="24" cy="24" r="1.8" fill="#fbbf24" />
      </svg>
    </div>
  );

  const meta = (
    <div style={{ minWidth: 0, lineHeight: 1.15 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: "#e2e8f0",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}
      >
        {shortCityLabel(city)}
      </div>
      <div
        suppressHydrationWarning
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          fontWeight: 700,
          color: "#f8fafc",
          fontVariantNumeric: "tabular-nums"
        }}
      >
        {hands.digital}
      </div>
      {utcLabel ? (
        <div style={{ fontSize: 8, fontFamily: "ui-monospace, monospace", color: "#94a3b8" }}>
          {utcLabel}
        </div>
      ) : null}
    </div>
  );

  if (variant === "inline") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
          padding: "4px 8px 4px 4px",
          borderRadius: 999,
          background: "rgba(13,18,29,0.72)",
          border: "1px solid rgba(255,255,255,0.1)"
        }}
        title={`${city} · ${utcLabel || ""}`.trim()}
      >
        {face}
        {meta}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        minWidth: size
      }}
      title={`${city} · ${utcLabel || ""}`.trim()}
    >
      {face}
      <div style={{ textAlign: "center", maxWidth: size + 12 }}>{meta}</div>
    </div>
  );
}
