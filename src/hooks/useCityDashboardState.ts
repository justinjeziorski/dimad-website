"use client";

import { useCallback, useEffect, useState } from "react";
import { EMERGENCY_FALLBACK_QUOTE } from "@/lib/quotes/fallback";
import {
  DEFAULT_CITY,
  fetchOpenMeteo,
  readLastLoc,
  readTempUnit,
  resolveSelectedClocks,
  setCachedWeather,
  snapshotFromPayload,
  writeTempUnit,
  type CityCoords,
  type CityWeatherSnapshot,
  type TempUnit
} from "@/lib/city/weather";

export type CityQuote = {
  quote: string;
  author: string;
  context: string;
};

export type CityClockRow = {
  id: string;
  city: string;
  tz: string;
  utcLabel: string;
};

type ParentCityBridge = {
  CC_YOUR_CITY?: {
    coords?: CityCoords;
    unit?: TempUnit;
    setUnit?: (unit: TempUnit) => void;
    refresh?: (force?: boolean) => void;
    data?: unknown;
  };
  WORLD_CLOCKS?: {
    togglePicker?: () => void;
    selectedIds?: () => string[];
    cityById?: (id: string) => { id: string; city: string; tz: string } | undefined;
  };
  COMMAND_CENTER?: {
    toggleFilter?: (group?: string) => void;
  };
  switchTab?: (tabId: string) => void;
  DAILY_QUOTE?: {
    pick?: () => { quote?: string; text?: string; author?: string; context?: string };
  };
};

type UseCityDashboardStateOptions = {
  /** When false, skip browser-only work (storage, fetch). Default true. */
  enabled?: boolean;
};

function parentBridge(): ParentCityBridge | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.parent && window.parent !== window) {
      return window.parent as unknown as ParentCityBridge;
    }
  } catch {
    /* cross-origin */
  }
  return window as unknown as ParentCityBridge;
}

function resolveCoords(): CityCoords {
  const parent = parentBridge();
  const fromParent = parent?.CC_YOUR_CITY?.coords;
  if (fromParent && Number.isFinite(fromParent.lat) && Number.isFinite(fromParent.lon)) {
    return {
      lat: Number(fromParent.lat),
      lon: Number(fromParent.lon),
      city: String(fromParent.city || DEFAULT_CITY.city)
    };
  }
  return readLastLoc() || DEFAULT_CITY;
}

export function useCityDashboardState(options: UseCityDashboardStateOptions = {}) {
  const enabled = options.enabled !== false;
  const [tempUnit, setTempUnitState] = useState<TempUnit>("C");
  const [coords, setCoords] = useState<CityCoords>(DEFAULT_CITY);
  const [weather, setWeather] = useState<CityWeatherSnapshot | null>(null);
  const [quote, setQuote] = useState<CityQuote>(EMERGENCY_FALLBACK_QUOTE);
  const [clocks, setClocks] = useState<CityClockRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshClocks = useCallback(() => {
    const parent = parentBridge();
    setClocks(
      resolveSelectedClocks((id) => {
        const hit = parent?.WORLD_CLOCKS?.cityById?.(id);
        return hit ? { id: hit.id, city: hit.city, tz: hit.tz } : null;
      })
    );
  }, []);

  const loadWeather = useCallback(async (unit: TempUnit, force = false) => {
    const loc = resolveCoords();
    setCoords(loc);
    try {
      const payload = await fetchOpenMeteo(loc.lat, loc.lon, unit, force);
      setCachedWeather(loc.lat, loc.lon, unit, loc.city, payload);
      setWeather(snapshotFromPayload(payload));
    } catch {
      /* keep prior snapshot */
    } finally {
      setLoading(false);
    }
  }, []);

  const setTempUnit = useCallback(
    (unit: TempUnit) => {
      const next = unit === "F" ? "F" : "C";
      setTempUnitState(next);
      writeTempUnit(next);
      const parent = parentBridge();
      if (parent?.CC_YOUR_CITY?.setUnit) {
        parent.CC_YOUR_CITY.setUnit(next);
      }
      void loadWeather(next, true);
    },
    [loadWeather]
  );

  const openCitiesPicker = useCallback(() => {
    parentBridge()?.WORLD_CLOCKS?.togglePicker?.();
  }, []);

  const openSettings = useCallback(() => {
    const parent = parentBridge();
    if (parent?.COMMAND_CENTER?.toggleFilter) {
      parent.COMMAND_CENTER.toggleFilter("core");
      return;
    }
    parent?.switchTab?.("nomad-city");
  }, []);

  const openCityGuide = useCallback(() => {
    parentBridge()?.switchTab?.("nomad-city");
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const unit = readTempUnit();
    setTempUnitState(unit);
    refreshClocks();
    void loadWeather(unit, false);

    const parent = parentBridge();
    const fromQuote = parent?.DAILY_QUOTE?.pick?.();
    if (fromQuote && (fromQuote.quote || fromQuote.text) && fromQuote.author) {
      setQuote({
        quote: String(fromQuote.quote || fromQuote.text || ""),
        author: String(fromQuote.author),
        context: String(fromQuote.context || "")
      });
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/quotes/daily", { credentials: "same-origin" });
        if (!res.ok) return;
        const json = (await res.json()) as Partial<CityQuote>;
        if (cancelled || !json.quote || !json.author) return;
        setQuote({
          quote: json.quote,
          author: json.author,
          context: json.context || ""
        });
      } catch {
        /* keep fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, loadWeather, refreshClocks]);

  useEffect(() => {
    if (!enabled) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "dimad_world_clocks") refreshClocks();
      if (e.key === "dimad_city_temp_unit" && (e.newValue === "C" || e.newValue === "F")) {
        setTempUnitState(e.newValue);
        void loadWeather(e.newValue, false);
      }
      if (e.key === "dimad_weather_last_loc") {
        void loadWeather(tempUnit, true);
      }
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data && e.data.type === "dimad:world-clocks") refreshClocks();
    };
    const onClocks = () => refreshClocks();
    window.addEventListener("storage", onStorage);
    window.addEventListener("message", onMessage);
    window.addEventListener("dimad:world-clocks", onClocks);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("dimad:world-clocks", onClocks);
    };
  }, [enabled, loadWeather, refreshClocks, tempUnit]);

  return {
    tempUnit,
    setTempUnit,
    coords,
    weather,
    quote,
    clocks,
    loading,
    openCitiesPicker,
    openSettings,
    openCityGuide,
    refreshWeather: () => loadWeather(tempUnit, true),
    refreshClocks
  };
}
