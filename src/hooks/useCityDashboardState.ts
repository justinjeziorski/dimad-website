"use client";

import { useCallback, useEffect, useState } from "react";
import { EMERGENCY_FALLBACK_QUOTE } from "@/lib/quotes/fallback";
import {
  DEFAULT_CITY,
  fetchOpenMeteo,
  fetchWeatherByCoords,
  fetchWeatherByQuery,
  readTempUnit,
  resolveSelectedClocks,
  setCachedWeather,
  snapshotFromPayload,
  snapshotFromWeatherApi,
  writeTempUnit,
  type CityCoords,
  type CityWeatherSnapshot,
  type TempUnit
} from "@/lib/city/weather";
import {
  offsetLabelForTz,
  readLocalLocation,
  readLocationServicesEnabled,
  writeLocalLocation,
  writeLocationServicesEnabled,
  type LocalLocation
} from "@/lib/city/localLocation";
import { refineLocationDisplay } from "@/lib/city/locationHubs";
import {
  isCountryToolkitFallback,
  resolveCountryToolkit
} from "@/data/city-toolkit/resolveCountryToolkit";
import {
  resolveGeolocationState,
  resolveManualCity,
  type ResolvedLocationState
} from "@/data/cities";

function canonicalizeCountryName(country?: string | null): string {
  const raw = String(country ?? "").trim();
  if (!raw) return "";
  const resolved = resolveCountryToolkit(raw);
  return isCountryToolkitFallback(resolved) ? raw : resolved.country;
}

function resolvedToLocal(
  resolved: ResolvedLocationState,
  pinned: boolean
): LocalLocation {
  const country = canonicalizeCountryName(resolved.country) || resolved.country;
  return writeLocalLocation({
    city: resolved.programmedCity,
    greetingPlaceName: resolved.greetingPlaceName,
    country,
    stateOrRegion: resolved.stateOrRegion,
    tz_id: resolved.timezone,
    lat: resolved.lat,
    lon: resolved.lon,
    curatedCityId: resolved.curatedCityId,
    helloOverride: resolved.helloOverride,
    source: resolved.source,
    pinned
  });
}

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

function locToCoords(loc: LocalLocation): CityCoords {
  return {
    lat: loc.lat,
    lon: loc.lon,
    city: loc.city,
    country: loc.country,
    tz_id: loc.tz_id
  };
}

function applyWeatherApiLocation(
  loc: Awaited<ReturnType<typeof fetchWeatherByCoords>>["location"],
  pinned = false,
  countryOverride?: string | null
): LocalLocation | null {
  if (!loc) return null;
  const countryRaw = String(countryOverride || loc.country || "").trim();
  const refined = refineLocationDisplay({
    city: String(loc.name || "Your City"),
    country: canonicalizeCountryName(countryRaw) || countryRaw,
    tz_id: String(loc.tz_id || "UTC"),
    lat: Number(loc.lat),
    lon: Number(loc.lon)
  });
  return writeLocalLocation({
    ...refined,
    pinned
  });
}

export function useCityDashboardState(options: UseCityDashboardStateOptions = {}) {
  const enabled = options.enabled !== false;
  const [tempUnit, setTempUnitState] = useState<TempUnit>("C");
  const [localLoc, setLocalLoc] = useState<LocalLocation>(() =>
    typeof window === "undefined" ? { city: "Yerevan", country: "Armenia", tz_id: "Asia/Yerevan", lat: 40.18, lon: 44.5 } : readLocalLocation()
  );
  const [coords, setCoords] = useState<CityCoords>(() => locToCoords(localLoc));
  const [weather, setWeather] = useState<CityWeatherSnapshot | null>(null);
  const [quote, setQuote] = useState<CityQuote>(EMERGENCY_FALLBACK_QUOTE);
  const [clocks, setClocks] = useState<CityClockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsManualCity, setNeedsManualCity] = useState(false);
  const [manualCityOpen, setManualCityOpen] = useState(false);
  const [locationServicesEnabled, setLocationServicesEnabled] = useState(true);
  const [permissionState, setPermissionState] = useState<
    PermissionState | "unsupported" | "unknown"
  >("unknown");

  const syncPermissionState = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermissionState("unsupported");
      return "unsupported" as const;
    }
    try {
      const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      setPermissionState(status.state);
      status.onchange = () => setPermissionState(status.state);
      return status.state;
    } catch {
      setPermissionState("unknown");
      return "unknown" as const;
    }
  }, []);

  const applyLocal = useCallback((loc: LocalLocation) => {
    setLocalLoc(loc);
    setCoords(locToCoords(loc));
  }, []);

  const resolveFromCoords = useCallback(
    async (lat: number, lon: number, unit: TempUnit, pinned = false) => {
      const api = await fetchWeatherByCoords(lat, lon, unit);
      const detected = api.location;
      const resolved = resolveGeolocationState({
        detectedCity: detected?.name,
        detectedCountry: detected?.country,
        detectedTimezone: detected?.tz_id,
        lat,
        lon
      });
      const next = resolvedToLocal(resolved, pinned);
      applyLocal(next);
      setNeedsManualCity(false);

      const hubMoved =
        Math.abs(resolved.lat - lat) > 0.02 || Math.abs(resolved.lon - lon) > 0.02;
      if (hubMoved) {
        try {
          const hubApi = await fetchWeatherByCoords(resolved.lat, resolved.lon, unit);
          const snap = snapshotFromWeatherApi(hubApi, unit);
          if (snap) setWeather(snap);
        } catch {
          const snap = snapshotFromWeatherApi(api, unit);
          if (snap) setWeather(snap);
        }
      } else {
        const snap = snapshotFromWeatherApi(api, unit);
        if (snap) setWeather(snap);
      }
      return next;
    },
    [applyLocal]
  );

  const refreshLocationFromGps = useCallback(async () => {
    if (!navigator.geolocation) {
      setPermissionState("unsupported");
      setNeedsManualCity(true);
      return false;
    }
    await syncPermissionState();
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void (async () => {
            try {
              await resolveFromCoords(pos.coords.latitude, pos.coords.longitude, tempUnit, false);
              await syncPermissionState();
              resolve(true);
            } catch {
              setNeedsManualCity(true);
              resolve(false);
            }
          })();
        },
        async () => {
          await syncPermissionState();
          setNeedsManualCity(true);
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
      );
    });
  }, [resolveFromCoords, syncPermissionState, tempUnit]);

  const setLocationServices = useCallback(
    async (on: boolean) => {
      writeLocationServicesEnabled(on);
      setLocationServicesEnabled(on);
      if (on) {
        // Prompt browser for permission / refresh current position
        const ok = await refreshLocationFromGps();
        if (!ok) setNeedsManualCity(true);
      } else {
        // App-level disable (browsers cannot revoke site permission via JS)
        setNeedsManualCity(true);
      }
    },
    [refreshLocationFromGps]
  );

  const refreshClocks = useCallback(() => {
    const parent = parentBridge();
    setClocks(
      resolveSelectedClocks((id) => {
        const hit = parent?.WORLD_CLOCKS?.cityById?.(id);
        return hit ? { id: hit.id, city: hit.city, tz: hit.tz } : null;
      })
    );
  }, []);

  const loadWeatherFor = useCallback(
    async (loc: LocalLocation, unit: TempUnit, force = false) => {
      try {
        // Weather always anchors to programmed hub lat/lon — do not overwrite greeting/hub from reverse-geocode.
        const api = await fetchWeatherByCoords(loc.lat, loc.lon, unit);
        const snap = snapshotFromWeatherApi(api, unit);
        if (snap) setWeather(snap);
      } catch {
        try {
          const payload = await fetchOpenMeteo(loc.lat, loc.lon, unit, force);
          setCachedWeather(loc.lat, loc.lon, unit, loc.city, payload);
          const snap = snapshotFromPayload(payload);
          if (snap) setWeather(snap);
        } catch {
          /* keep prior */
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const setTempUnit = useCallback(
    (unit: TempUnit) => {
      const next = unit === "F" ? "F" : "C";
      setTempUnitState(next);
      writeTempUnit(next);
      const parent = parentBridge();
      if (parent?.CC_YOUR_CITY?.setUnit) {
        parent.CC_YOUR_CITY.setUnit(next);
      }
      void loadWeatherFor(localLoc, next, true);
    },
    [loadWeatherFor, localLoc]
  );

  const pinCuratedCity = useCallback(
    async (cityId: string) => {
      const id = String(cityId || "").trim();
      if (!id) return false;
      const resolved = resolveManualCity(id);
      const next = resolvedToLocal(resolved, true);
      applyLocal(next);
      setNeedsManualCity(false);
      setManualCityOpen(false);
      await loadWeatherFor(next, tempUnit, true);
      return true;
    },
    [applyLocal, loadWeatherFor, tempUnit]
  );

  /** @deprecated Prefer pinCuratedCity — kept for query/country fallback pins. */
  const pinCityByQuery = useCallback(
    async (query: string) => {
      const q = String(query || "").trim();
      if (!q) return false;

      const toolkitHit = resolveCountryToolkit(q);
      const knownToolkitCountry = !isCountryToolkitFallback(toolkitHit);
      const geocodeQuery = knownToolkitCountry ? toolkitHit.country : q;

      const forceToolkitCountry = () => {
        if (!knownToolkitCountry) return false;
        const current = readLocalLocation();
        const forced = writeLocalLocation({
          ...current,
          country: toolkitHit.country,
          greetingPlaceName: current.greetingPlaceName || current.city,
          source: "manual",
          pinned: true
        });
        applyLocal(forced);
        setNeedsManualCity(false);
        setManualCityOpen(false);
        return true;
      };

      try {
        const api = await fetchWeatherByQuery(geocodeQuery);
        const next = applyWeatherApiLocation(
          api.location,
          true,
          knownToolkitCountry ? toolkitHit.country : undefined
        );
        if (!next) return forceToolkitCountry();
        const withGreeting = writeLocalLocation({
          ...next,
          greetingPlaceName: next.city,
          source: "manual",
          pinned: true
        });
        applyLocal(withGreeting);
        setNeedsManualCity(false);
        setManualCityOpen(false);
        const snap = snapshotFromWeatherApi(api, tempUnit);
        if (snap) setWeather(snap);
        return true;
      } catch {
        return forceToolkitCountry();
      }
    },
    [applyLocal, tempUnit]
  );

  const openCitiesPicker = useCallback(() => {
    parentBridge()?.WORLD_CLOCKS?.togglePicker?.();
  }, []);

  const openCityGuide = useCallback(() => {
    parentBridge()?.switchTab?.("nomad-city");
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const unit = readTempUnit();
    setTempUnitState(unit);
    const servicesOn = readLocationServicesEnabled();
    setLocationServicesEnabled(servicesOn);
    void syncPermissionState();
    const saved = readLocalLocation();
    applyLocal(saved);
    refreshClocks();
    void loadWeatherFor(saved, unit, false);

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

    // Browser geolocation — only when services enabled and city not manually pinned
    if (
      servicesOn &&
      !saved.pinned &&
      typeof navigator !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          void resolveFromCoords(pos.coords.latitude, pos.coords.longitude, unit, false).catch(
            () => {
              if (!cancelled) setNeedsManualCity(true);
            }
          );
        },
        () => {
          if (!cancelled) setNeedsManualCity(true);
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60 * 1000 }
      );
    } else if (!servicesOn) {
      setNeedsManualCity(true);
    }

    return () => {
      cancelled = true;
    };
  }, [enabled, applyLocal, loadWeatherFor, refreshClocks, resolveFromCoords, syncPermissionState]);

  useEffect(() => {
    if (!enabled) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "dimad_world_clocks") refreshClocks();
      if (e.key === "dimad_city_temp_unit" && (e.newValue === "C" || e.newValue === "F")) {
        setTempUnitState(e.newValue);
        void loadWeatherFor(localLoc, e.newValue, false);
      }
      if (e.key === "dimad_local_location_v1" || e.key === "dimad_weather_last_loc") {
        const next = readLocalLocation();
        applyLocal(next);
        void loadWeatherFor(next, tempUnit, true);
      }
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data && e.data.type === "dimad:world-clocks") refreshClocks();
    };
    const onClocks = () => refreshClocks();
    const onLocal = () => {
      const next = readLocalLocation();
      applyLocal(next);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("message", onMessage);
    window.addEventListener("dimad:world-clocks", onClocks);
    window.addEventListener("dimad:local-location", onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("dimad:world-clocks", onClocks);
      window.removeEventListener("dimad:local-location", onLocal);
    };
  }, [enabled, loadWeatherFor, refreshClocks, tempUnit, localLoc, applyLocal]);

  const localClock: CityClockRow = {
    id: "local",
    city: localLoc.city,
    tz: localLoc.tz_id || "UTC",
    utcLabel: offsetLabelForTz(localLoc.tz_id || "UTC")
  };

  const greetingPlaceName = localLoc.greetingPlaceName || localLoc.city;
  const locationState: ResolvedLocationState = {
    greetingPlaceName,
    programmedCity: localLoc.city,
    stateOrRegion: localLoc.stateOrRegion || "",
    country: localLoc.country,
    timezone: localLoc.tz_id || "UTC",
    lat: localLoc.lat,
    lon: localLoc.lon,
    curatedCityId: localLoc.curatedCityId ?? null,
    helloOverride: localLoc.helloOverride ?? null,
    source: localLoc.source || (localLoc.pinned ? "manual" : "geolocation")
  };

  return {
    tempUnit,
    setTempUnit,
    coords,
    localLoc,
    locationState,
    greetingPlaceName,
    localClock,
    weather,
    quote,
    /** Additional world clocks only (not including local/current). */
    clocks,
    loading,
    needsManualCity,
    manualCityOpen,
    setManualCityOpen,
    pinCuratedCity,
    pinCityByQuery,
    openCitiesPicker,
    openCityGuide,
    locationServicesEnabled,
    setLocationServices,
    permissionState,
    refreshLocationFromGps,
    refreshWeather: () => loadWeatherFor(localLoc, tempUnit, true),
    refreshClocks
  };
}

// keep DEFAULT_CITY export path happy for any leftover imports
void DEFAULT_CITY;
