import { useCallback, useEffect, useRef, useState } from "react";
import {
  extractCityFromTimezone,
  normalizeCityKey,
  resolveCurrentLocation
} from "@/lib/locationResolver";

export interface CityBackgroundData {
  city: string;
  cityKey: string;
  imageUrl: string | null;
  photographerName: string | null;
  photographerUrl: string | null;
  notFound?: boolean;
  cached?: boolean;
}

const memoryCache = new Map<string, CityBackgroundData>();
const inFlightRequests = new Map<string, Promise<CityBackgroundData | null>>();

async function fetchCityImageWithDedup(city: string): Promise<CityBackgroundData | null> {
  const key = normalizeCityKey(city);
  if (!key) return null;

  if (memoryCache.has(key)) {
    return memoryCache.get(key) || null;
  }

  const pending = inFlightRequests.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch(`/api/city-image?city=${encodeURIComponent(city)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as CityBackgroundData;
      memoryCache.set(key, data);
      return data;
    } catch {
      return null;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}

export function useWorldClockBackground(
  selectedTimezone: string | "CURRENT_LOCATION",
  pinnedTimezones: string[] = []
) {
  const [background, setBackground] = useState<CityBackgroundData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasPrefetched = useRef(false);

  const loadActiveBackground = useCallback(async () => {
    setIsLoading(true);
    try {
      let targetCity = "New York";

      if (selectedTimezone === "CURRENT_LOCATION") {
        const resolved = await resolveCurrentLocation();
        targetCity = resolved.city;
      } else {
        const resolved = extractCityFromTimezone(selectedTimezone);
        targetCity = resolved.city;
      }

      const imageData = await fetchCityImageWithDedup(targetCity);
      setBackground(imageData);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimezone]);

  useEffect(() => {
    loadActiveBackground();
  }, [loadActiveBackground]);

  useEffect(() => {
    if (hasPrefetched.current || pinnedTimezones.length === 0) return;
    hasPrefetched.current = true;

    const timer = setTimeout(() => {
      pinnedTimezones.forEach((tz) => {
        if (tz === "CURRENT_LOCATION") return;
        const { city } = extractCityFromTimezone(tz);
        fetchCityImageWithDedup(city);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [pinnedTimezones]);

  return { background, isLoading };
}
