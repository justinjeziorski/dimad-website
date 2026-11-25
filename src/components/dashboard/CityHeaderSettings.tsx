"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin, RefreshCw, X } from "lucide-react";
import { CURATED_CITIES, type CuratedCityEntry } from "@/data/cities";
import type { TempUnit } from "@/lib/city/weather";

type CityHeaderSettingsProps = {
  open: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  city: string;
  country: string;
  tzLabel?: string;
  tempUnit: TempUnit;
  onTempUnitChange: (unit: TempUnit) => void;
  locationServicesEnabled: boolean;
  onLocationServicesChange: (on: boolean) => void | Promise<void>;
  onRefreshLocation: () => void | boolean | Promise<void | boolean>;
  /** Pins a curated programmed city (resolveManualCity). */
  onPinCuratedCity: (cityId: string) => Promise<boolean> | boolean;
  permissionState?: PermissionState | "unsupported" | "unknown";
};

export default function CityHeaderSettings({
  open,
  onClose,
  city,
  country,
  tzLabel,
  tempUnit,
  onTempUnitChange,
  locationServicesEnabled,
  onLocationServicesChange,
  onRefreshLocation,
  onPinCuratedCity,
  permissionState = "unknown"
}: CityHeaderSettingsProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  useEffect(() => {
    if (open) return;
    setCityOpen(false);
    setCityQuery("");
  }, [open]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return CURATED_CITIES;
    return CURATED_CITIES.filter((entry) => {
      const hay = [entry.city, entry.stateOrRegion, entry.country, ...entry.aliases]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [cityQuery]);

  const groupedCities = useMemo(() => {
    const map = new Map<string, CuratedCityEntry[]>();
    for (const entry of filteredCities) {
      const key = entry.country || "Other";
      const list = map.get(key) || [];
      list.push(entry);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredCities]);

  const placeLabel = country ? `${city}, ${country}` : city;
  const denied = permissionState === "denied";

  if (!open || typeof document === "undefined") return null;

  const panelWidth = Math.min(340, Math.max(280, typeof window !== "undefined" ? window.innerWidth - 32 : 320));

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        pointerEvents: "none"
      }}
    >
    <div
      ref={panelRef}
      role="dialog"
      aria-label="City header settings"
      aria-modal="true"
      style={{
        pointerEvents: "auto",
        width: panelWidth,
        maxHeight: "min(90vh, 560px)",
        display: "flex",
        flexDirection: "column",
        borderRadius: 14,
        overflow: "hidden",
        background: "rgba(13,18,29,0.98)",
        border: "1px solid rgba(51,65,85,0.9)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.55)",
        color: "#e2e8f0"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderBottom: "1px solid rgba(51,65,85,0.75)"
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>Settings</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: 4,
            lineHeight: 0
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14, flex: 1, minHeight: 0, overflowY: "auto" }}>
        {/* Current location */}
        <section>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 8 }}>
            CURRENT LOCATION
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.4)"
            }}
          >
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fde68a" }}>{placeLabel}</div>
              {tzLabel ? (
                <div style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "#94a3b8", marginTop: 2 }}>
                  {tzLabel}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              title="Refresh location"
              disabled={refreshing || !locationServicesEnabled}
              onClick={async () => {
                setRefreshing(true);
                try {
                  await onRefreshLocation();
                } finally {
                  setRefreshing(false);
                }
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: "1px solid rgba(71,85,105,0.8)",
                background: "rgba(15,23,42,0.9)",
                color: locationServicesEnabled ? "#fbbf24" : "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: locationServicesEnabled ? "pointer" : "not-allowed",
                flexShrink: 0
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p style={{ fontSize: 11, lineHeight: 1.45, color: "#94a3b8", margin: "8px 0 0" }}>
            {denied
              ? "Location is blocked for this site. Open your browser’s site settings → Location → Allow, then tap Refresh."
              : permissionState === "prompt" || permissionState === "unknown"
                ? "Turning location services on may show a browser permission prompt. Use Refresh after allowing access."
                : "Refresh pulls your current city when browser location is allowed."}
          </p>
        </section>

        {/* Location services toggle — app preference; browser permission is separate */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(15,23,42,0.85)",
            border: "1px solid rgba(51,65,85,0.75)"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Location services</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                {locationServicesEnabled
                  ? "On — auto-detect when the browser allows it"
                  : "Off — stop auto-updates; use a pinned city"}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={locationServicesEnabled}
              onClick={() => void onLocationServicesChange(!locationServicesEnabled)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 999,
                border: "none",
                padding: 2,
                cursor: "pointer",
                background: locationServicesEnabled ? "rgba(251,191,36,0.85)" : "rgba(71,85,105,0.9)",
                transition: "background 0.15s ease",
                flexShrink: 0
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: locationServicesEnabled ? "#0f172a" : "#cbd5e1",
                  transform: locationServicesEnabled ? "translateX(20px)" : "translateX(0)",
                  transition: "transform 0.15s ease"
                }}
              />
            </button>
          </div>
          <p style={{ fontSize: 11, lineHeight: 1.45, color: "#94a3b8", margin: 0 }}>
            {locationServicesEnabled
              ? denied
                ? "This toggle only controls Dimad OS. Because location is blocked in the browser, allow it in site settings first."
                : "On requests location when allowed. Browsers keep their own permission separate from this switch."
              : "Off stops Dimad OS from using your location. To fully revoke browser access, use the lock icon → Site settings → Location."}
          </p>
        </section>

        {/* Manual City — curated programmed hubs; country toolkit inherits from entry.country */}
        <section style={{ position: "relative" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 8 }}>
            MANUAL CITY
          </div>
          <button
            type="button"
            onClick={() => setCityOpen((v) => !v)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(51,65,85,0.8)",
              background: "#0b0f17",
              color: "#e2e8f0",
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            {cityOpen ? "Close city list…" : "Choose a city…"}
          </button>
          {cityOpen ? (
            <div
              style={{
                marginTop: 8,
                borderRadius: 10,
                border: "1px solid rgba(51,65,85,0.85)",
                background: "rgba(15,23,42,0.98)",
                overflow: "hidden"
              }}
            >
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder="Search cities…"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "none",
                  borderBottom: "1px solid rgba(51,65,85,0.7)",
                  background: "transparent",
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#f1f5f9",
                  outline: "none"
                }}
              />
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {groupedCities.length === 0 ? (
                  <div style={{ padding: "10px 12px", fontSize: 11, color: "#64748b" }}>
                    No curated cities match.
                  </div>
                ) : (
                  groupedCities.map(([countryName, cities]) => (
                    <div key={countryName}>
                      <div
                        style={{
                          padding: "8px 12px 4px",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#94a3b8",
                          position: "sticky",
                          top: 0,
                          background: "rgba(15,23,42,0.98)"
                        }}
                      >
                        {countryName}
                      </div>
                      {cities.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          disabled={pinBusy}
                          onClick={async () => {
                            setPinBusy(true);
                            try {
                              const ok = await onPinCuratedCity(entry.id);
                              if (ok) {
                                setCityOpen(false);
                                setCityQuery("");
                              }
                            } finally {
                              setPinBusy(false);
                            }
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            background: "transparent",
                            padding: "7px 12px",
                            fontSize: 12,
                            color: "#e2e8f0",
                            cursor: pinBusy ? "wait" : "pointer"
                          }}
                        >
                          {entry.city}
                          {entry.stateOrRegion ? (
                            <span style={{ color: "#64748b", marginLeft: 8, fontSize: 10 }}>
                              {entry.stateOrRegion}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </section>

        {/* Temperature */}
        <section>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 8 }}>
            TEMPERATURE
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 10,
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(51,65,85,0.75)",
              padding: 4,
              gap: 2
            }}
          >
            {(["C", "F"] as TempUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onTempUnitChange(u)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  background: tempUnit === u ? "#fbbf24" : "transparent",
                  color: tempUnit === u ? "#0f172a" : "#94a3b8"
                }}
              >
                °{u}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
    </div>,
    document.body
  );
}
