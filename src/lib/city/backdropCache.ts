import { normalizeCityKey } from "@/lib/location/locationResolver";

export const CITY_BACKDROP_META_KEY = "dimad_city_backdrop_meta_v1";
export const CITY_BACKDROP_CACHE = "your-city-backdrops";
export const CITY_BACKDROP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const CITY_BACKDROP_FALLBACK = "/assets/yerevan-hero.jpg";

export type CityBackdropMeta = {
  city: string;
  cityKey: string;
  imageUrl: string;
  fetchedAt: number;
};

type CityImageApiResponse = {
  city?: string;
  cityKey?: string;
  imageUrl?: string | null;
  thumbUrl?: string | null;
  notFound?: boolean;
};

/** Rewrite Unsplash (or similar) URLs to a lightweight WebP crop. */
export function toLightweightBackdropUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("unsplash.com") || u.hostname.includes("images.unsplash.com")) {
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      u.searchParams.set("w", "1200");
      u.searchParams.set("q", "75");
      u.searchParams.set("fm", "webp");
      return u.toString();
    }
  } catch {
    /* keep original */
  }
  return url;
}

function readMetaMap(): Record<string, CityBackdropMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(CITY_BACKDROP_META_KEY) || "{}");
    return raw && typeof raw === "object" ? (raw as Record<string, CityBackdropMeta>) : {};
  } catch {
    return {};
  }
}

function writeMetaMap(map: Record<string, CityBackdropMeta>): void {
  try {
    localStorage.setItem(CITY_BACKDROP_META_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

export function readBackdropMeta(city: string): CityBackdropMeta | null {
  const key = normalizeCityKey(city);
  if (!key) return null;
  const row = readMetaMap()[key];
  if (!row?.imageUrl || !Number.isFinite(row.fetchedAt)) return null;
  if (Date.now() - row.fetchedAt > CITY_BACKDROP_TTL_MS) return null;
  return row;
}

export function writeBackdropMeta(meta: CityBackdropMeta): void {
  const key = meta.cityKey || normalizeCityKey(meta.city);
  if (!key) return;
  const map = readMetaMap();
  map[key] = { ...meta, cityKey: key };
  writeMetaMap(map);
}

async function openBackdropCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(CITY_BACKDROP_CACHE);
  } catch {
    return null;
  }
}

export async function readCachedBackdropBlob(imageUrl: string): Promise<string | null> {
  const cache = await openBackdropCache();
  if (!cache) return null;
  try {
    const hit = await cache.match(imageUrl);
    if (!hit || !hit.ok) return null;
    const blob = await hit.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function putBackdropBlob(imageUrl: string, response: Response): Promise<void> {
  const cache = await openBackdropCache();
  if (!cache) return;
  try {
    await cache.put(imageUrl, response.clone());
  } catch {
    /* ignore */
  }
}

async function fetchAndCacheImage(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { mode: "cors", credentials: "omit", cache: "force-cache" });
    if (!res.ok) return null;
    await putBackdropBlob(imageUrl, res);
    const blob = await res.clone().blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

async function resolveRemoteImageUrl(city: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/city-image?city=${encodeURIComponent(city)}`, {
      credentials: "same-origin"
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CityImageApiResponse;
    if (!data?.imageUrl || data.notFound) return null;
    return toLightweightBackdropUrl(String(data.imageUrl));
  } catch {
    return null;
  }
}

export type ResolvedBackdrop = {
  city: string;
  cityKey: string;
  /** Object URL or absolute/relative URL ready for <img src> */
  displayUrl: string;
  source: "cache" | "network" | "fallback";
};

/**
 * Resolve a city backdrop with localStorage meta (7d TTL) + Cache API bytes.
 * Never throws — falls back to the local Yerevan hero asset.
 */
export async function resolveCityBackdrop(city: string): Promise<ResolvedBackdrop> {
  const label = String(city || "Yerevan").trim() || "Yerevan";
  const cityKey = normalizeCityKey(label) || "yerevan";

  const cachedMeta = readBackdropMeta(label);
  if (cachedMeta?.imageUrl) {
    const blobUrl = await readCachedBackdropBlob(cachedMeta.imageUrl);
    if (blobUrl) {
      return {
        city: cachedMeta.city || label,
        cityKey,
        displayUrl: blobUrl,
        source: "cache"
      };
    }
    // Meta hit but bytes missing — re-fetch image into Cache API
    const refreshed = await fetchAndCacheImage(cachedMeta.imageUrl);
    if (refreshed) {
      return {
        city: cachedMeta.city || label,
        cityKey,
        displayUrl: refreshed,
        source: "network"
      };
    }
  }

  const remoteUrl = await resolveRemoteImageUrl(label);
  if (remoteUrl) {
    writeBackdropMeta({
      city: label,
      cityKey,
      imageUrl: remoteUrl,
      fetchedAt: Date.now()
    });
    const blobUrl = (await fetchAndCacheImage(remoteUrl)) || remoteUrl;
    return {
      city: label,
      cityKey,
      displayUrl: blobUrl,
      source: "network"
    };
  }

  return {
    city: label,
    cityKey,
    displayUrl: CITY_BACKDROP_FALLBACK,
    source: "fallback"
  };
}
