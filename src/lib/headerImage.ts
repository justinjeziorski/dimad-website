export interface HeaderPhotoResult {
  imageUrl: string;
  blurHash?: string;
  photographerName?: string;
  photographerUrl?: string;
  matchedLevel: "city" | "country" | "fallback";
  queryUsed?: string;
}

export const FALLBACK_HEADER_IMAGE = "/images/headers/los-angeles-fallback.jpg";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
/** Don't stick a failed lookup for a full day — allow retries soon. */
const FALLBACK_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

interface CachedPhotoEntry {
  expiresAt: number;
  data: HeaderPhotoResult;
}

const memoryCache = new Map<string, CachedPhotoEntry>();

function readPublicEnv(name: string): string {
  try {
    if (typeof process !== "undefined" && process.env && typeof process.env[name] === "string") {
      return process.env[name] || "";
    }
  } catch {
    /* embed bundles may not have process */
  }
  return "";
}

function readCache(key: string): HeaderPhotoResult | null {
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > Date.now()) return mem.data;

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(`header_photo:${key}`);
      if (raw) {
        const parsed: CachedPhotoEntry = JSON.parse(raw);
        if (parsed.expiresAt > Date.now()) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
        window.localStorage.removeItem(`header_photo:${key}`);
      }
    } catch {
      // Ignore storage errors
    }
  }
  return null;
}

function writeCache(key: string, data: HeaderPhotoResult, ttlMs = CACHE_TTL_MS): void {
  const entry: CachedPhotoEntry = {
    expiresAt: Date.now() + ttlMs,
    data
  };
  memoryCache.set(key, entry);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(`header_photo:${key}`, JSON.stringify(entry));
    } catch {
      // Ignore quota/storage errors
    }
  }
}

/** Drop stale fallback cache entries so a previously failed city can retry. */
export function clearHeaderPhotoFallbackCache(city?: string, country?: string): void {
  const keys: string[] = [];
  if (city != null || country != null) {
    keys.push(`${(city || "").toLowerCase()}|${(country || "").toLowerCase()}`);
  } else if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k?.startsWith("header_photo:")) keys.push(k.slice("header_photo:".length));
      }
    } catch {
      /* ignore */
    }
  }

  for (const key of keys) {
    const hit = readCache(key);
    if (hit?.matchedLevel === "fallback") {
      memoryCache.delete(key);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(`header_photo:${key}`);
        } catch {
          /* ignore */
        }
      }
    }
  }
}

async function searchUnsplashLandscape(
  query: string,
  accessKey: string
): Promise<Omit<HeaderPhotoResult, "matchedLevel" | "queryUsed"> | null> {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("per_page", "5");
  url.searchParams.set("content_filter", "high");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${accessKey}`
    }
  });

  if (!res.ok) {
    return null;
  }

  const json = await res.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  if (results.length === 0) {
    return null;
  }

  const chosen =
    results.find((p: { width?: number; height?: number }) => (p?.width ?? 0) > (p?.height ?? 0)) ??
    results[0];

  const imageUrl: string | undefined =
    chosen?.urls?.regular || chosen?.urls?.full || chosen?.urls?.raw;

  if (!imageUrl) return null;

  const utmSuffix = "?utm_source=dimad&utm_medium=referral";
  const profileBase = chosen?.user?.links?.html;

  return {
    imageUrl,
    blurHash: chosen?.blur_hash,
    photographerName: chosen?.user?.name,
    photographerUrl: profileBase ? `${profileBase}${utmSuffix}` : undefined
  };
}

async function searchViaServerProxy(
  query: string
): Promise<Omit<HeaderPhotoResult, "matchedLevel" | "queryUsed"> | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(`/api/header-background/search?query=${encodeURIComponent(query)}`, {
      credentials: "same-origin"
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Omit<HeaderPhotoResult, "matchedLevel" | "queryUsed"> | null;
    if (!json?.imageUrl) return null;
    return json;
  } catch {
    return null;
  }
}

/** Battle-tested city image endpoint already used by world-clock discs. */
async function searchViaCityImageApi(
  city: string
): Promise<Omit<HeaderPhotoResult, "matchedLevel" | "queryUsed"> | null> {
  if (typeof window === "undefined" || !city.trim()) return null;
  try {
    const res = await fetch(`/api/city-image?city=${encodeURIComponent(city.trim())}`, {
      credentials: "same-origin"
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      imageUrl?: string | null;
      photographerName?: string | null;
      photographerUrl?: string | null;
      notFound?: boolean;
    };
    if (!json?.imageUrl || json.notFound) return null;
    const utmSuffix = "?utm_source=dimad&utm_medium=referral";
    const profile = json.photographerUrl
      ? json.photographerUrl.includes("utm_source=")
        ? json.photographerUrl
        : `${json.photographerUrl}${utmSuffix}`
      : undefined;
    return {
      imageUrl: json.imageUrl,
      photographerName: json.photographerName || undefined,
      photographerUrl: profile
    };
  } catch {
    return null;
  }
}

/**
 * Resolves a header background image for a location:
 * 1) Tries city (e.g., "Santa Monica" or "Los Angeles")
 * 2) Reverts to country (e.g., "United States") if city has no Unsplash results
 * 3) Falls back to static bundled image if API fails or is rate-limited
 */
export async function resolveHeaderBackground(params: {
  city?: string | null;
  country?: string | null;
  unsplashAccessKey?: string;
}): Promise<HeaderPhotoResult> {
  const city = params.city?.trim() || "";
  const country = params.country?.trim() || "";
  const cacheKey = `${city.toLowerCase()}|${country.toLowerCase()}`;

  const cached = readCache(cacheKey);
  // Ignore previously cached hard fallbacks so a flaky first load can recover.
  if (cached && cached.matchedLevel !== "fallback") return cached;

  const accessKey = params.unsplashAccessKey || readPublicEnv("NEXT_PUBLIC_UNSPLASH_ACCESS_KEY");

  const search = async (query: string) => {
    if (accessKey) {
      const direct = await searchUnsplashLandscape(query, accessKey);
      if (direct) return direct;
    }
    return searchViaServerProxy(query);
  };

  try {
    if (city) {
      const cityQuery = `${city} city landscape`;
      const cityPhoto = (await search(cityQuery)) || (await searchViaCityImageApi(city));
      if (cityPhoto) {
        const result: HeaderPhotoResult = {
          ...cityPhoto,
          matchedLevel: "city",
          queryUsed: cityQuery
        };
        writeCache(cacheKey, result);
        return result;
      }
    }

    if (country) {
      const countryQuery = `${country} landscape`;
      const countryPhoto =
        (await search(countryQuery)) || (await searchViaCityImageApi(country));
      if (countryPhoto) {
        const result: HeaderPhotoResult = {
          ...countryPhoto,
          matchedLevel: "country",
          queryUsed: countryQuery
        };
        writeCache(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Fall through to static fallback
  }

  const fallbackResult: HeaderPhotoResult = {
    imageUrl: FALLBACK_HEADER_IMAGE,
    matchedLevel: "fallback"
  };
  writeCache(cacheKey, fallbackResult, FALLBACK_CACHE_TTL_MS);
  return fallbackResult;
}
