"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Car,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock,
  CloudSun,
  Droplets,
  HeartPulse,
  Landmark,
  LayoutGrid,
  PhoneCall,
  Plug,
  Plus,
  Settings,
  Shield,
  ShieldAlert,
  ShoppingCart,
  Smartphone,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Truck,
  Utensils,
  Wind,
  type LucideIcon
} from "lucide-react";
import {
  formatWind,
  type CityCoords,
  type CityWeatherSnapshot,
  type TempUnit
} from "@/lib/city/weather";
import type { CityClockRow, CityQuote } from "@/hooks/useCityDashboardState";
import { getLocalGreeting } from "@/lib/city/localGreeting";
import { COUNTRY_TOOLKIT_LIST } from "@/data/city-toolkit/countries";
import {
  flagEmojiFromIso2,
  isCountryToolkitFallback,
  parseToolkitHello,
  resolveCountryToolkit,
  toolkitLinkOrNull
} from "@/data/city-toolkit/resolveCountryToolkit";
import CityHeaderBackdrop, {
  HeaderPhotoCredit
} from "@/components/dashboard/CityHeaderBackdrop";
import LiveClock from "@/components/dashboard/LiveClock";
import WorldClockDisc from "@/components/dashboard/WorldClockDisc";
import WorldCitiesPicker from "@/components/dashboard/WorldCitiesPicker";
import LocalCityPicker from "@/components/dashboard/LocalCityPicker";
import CityHeaderSettings from "@/components/dashboard/CityHeaderSettings";

type UtilityTab = "overview" | "logistics" | "emergency" | "weather";

type MenuOption = {
  id: UtilityTab | "city-preferred";
  label: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
};

type LogisticsTile = {
  title: string;
  sub: string;
  href: string | null;
  icon: LucideIcon;
  tone?: "emerald" | "sky" | "amber";
};

const IS_DEV = process.env.NODE_ENV === "development";

const DEV_COUNTRY_PRESETS = [
  { label: "Armenia", value: "Armenia" },
  { label: "Thailand", value: "Thailand" },
  { label: "Spain", value: "Spain" },
  { label: "Bulgaria", value: "Bulgaria" },
  { label: "Jamaica", value: "Jamaica" },
  { label: "Unmapped (Atlantis)", value: "Atlantis" }
] as const;

export type YerevanDashboardHeaderProps = {
  tempUnit: TempUnit;
  onTempUnitChange: (unit: TempUnit) => void;
  coords: CityCoords;
  /** Current-location clock (separate from world clock picker). */
  localClock: CityClockRow;
  weather: CityWeatherSnapshot | null;
  quote: CityQuote;
  /** Up to 3 additional world clocks (excludes local). */
  clocks: CityClockRow[];
  onOpenCities?: () => void;
  onCitiesChange?: () => void;
  onOpenCityGuide?: () => void;
  /** Exact place for the greeting line (may differ from programmed hub under geolocation). */
  greetingPlaceName?: string;
  /** Optional curated-city hello override (e.g. Bilbao → Kaixo). */
  helloOverride?: string | null;
  needsManualCity?: boolean;
  manualCityOpen?: boolean;
  onManualCityOpenChange?: (open: boolean) => void;
  onPinCity?: (query: string) => Promise<boolean> | boolean;
  onPinCuratedCity?: (cityId: string) => Promise<boolean> | boolean;
  locationServicesEnabled?: boolean;
  onLocationServicesChange?: (on: boolean) => void | Promise<void>;
  permissionState?: PermissionState | "unsupported" | "unknown";
  onRefreshLocation?: () => void | boolean | Promise<void | boolean>;
  /** @deprecated Prefer backdropCurrentSrc / backdropIncomingSrc crossfade pair */
  backdropSrc?: string;
  backdropCurrentSrc?: string;
  backdropIncomingSrc?: string;
  onBackdropIncomingLoaded?: (src: string) => void;
  backdropPhotographerName?: string;
  backdropPhotographerUrl?: string;
  fontClassName?: string;
};

function buildLogisticsTiles(toolkit: ReturnType<typeof resolveCountryToolkit>): LogisticsTile[] {
  const tiles: LogisticsTile[] = [
    {
      title: "Rideshare",
      sub: toolkit.rideshare,
      href: toolkitLinkOrNull(toolkit.rideshareUrl),
      icon: Car
    },
    {
      title: "Food Delivery",
      sub: toolkit.foodDelivery,
      href: toolkitLinkOrNull(toolkit.foodDeliveryUrl),
      icon: Utensils
    },
    {
      title: "Groceries",
      sub: toolkit.groceryDelivery,
      href: toolkitLinkOrNull(toolkit.groceryDeliveryUrl),
      icon: ShoppingCart
    }
  ];

  if (toolkit.nordVpn) {
    tiles.push({
      title: "VPN",
      sub: "NordVPN",
      href: "https://nordvpn.com/",
      icon: Shield
    });
  }

  if (toolkit.airalo) {
    tiles.push({
      title: "eSIM",
      sub: "Airalo",
      href: "https://www.airalo.com/",
      icon: Smartphone
    });
  }

  tiles.push(
    {
      title: "Currency",
      sub: toolkit.currency,
      href: null,
      icon: CircleDollarSign
    },
    {
      title: "Power",
      sub: `Type ${toolkit.plugTypes}`,
      href: null,
      icon: Plug
    }
  );

  return tiles;
}

function displayTemp(value: number | null | undefined, unit: TempUnit) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}°${unit}`;
}

function weatherIcon(code: number, className = "w-5 h-5 text-amber-400") {
  if (code === 0 || code === 1) return <Sun className={className} />;
  return <CloudSun className={className} />;
}

type YourCitySections = {
  quote: boolean;
  liveClock: boolean;
  clocks: boolean;
  weather: boolean;
};

const DEFAULT_YOUR_CITY_SECTIONS: YourCitySections = {
  quote: true,
  liveClock: true,
  clocks: true,
  weather: true
};

function readYourCitySections(): YourCitySections {
  if (typeof window === "undefined") return DEFAULT_YOUR_CITY_SECTIONS;
  try {
    const root = document.getElementById("yerevan-header-root");
    if (
      root?.dataset.ycQuote != null ||
      root?.dataset.ycLiveClock != null ||
      root?.dataset.ycClocks != null ||
      root?.dataset.ycWeather != null
    ) {
      return {
        quote: root.dataset.ycQuote !== "0",
        liveClock: root.dataset.ycLiveClock !== "0",
        clocks: root.dataset.ycClocks !== "0",
        weather: root.dataset.ycWeather !== "0"
      };
    }
    const raw = JSON.parse(localStorage.getItem("dimad_cc_modules") || "");
    const hidden = Array.isArray(raw?.hidden) ? (raw.hidden as string[]) : [];
    return {
      quote: !hidden.includes("yc-quote"),
      liveClock: !hidden.includes("yc-live-clock"),
      clocks: !hidden.includes("yc-clocks"),
      weather: !hidden.includes("yc-weather")
    };
  } catch {
    return DEFAULT_YOUR_CITY_SECTIONS;
  }
}

export default function YerevanDashboardHeader({
  tempUnit,
  onTempUnitChange,
  coords,
  localClock,
  weather,
  quote,
  clocks,
  onOpenCities,
  onCitiesChange,
  onOpenCityGuide,
  greetingPlaceName,
  helloOverride = null,
  needsManualCity = false,
  manualCityOpen = false,
  onManualCityOpenChange,
  onPinCity,
  onPinCuratedCity,
  locationServicesEnabled = true,
  onLocationServicesChange,
  permissionState = "unknown",
  onRefreshLocation,
  backdropSrc = "",
  backdropCurrentSrc,
  backdropIncomingSrc = "",
  onBackdropIncomingLoaded,
  backdropPhotographerName,
  backdropPhotographerUrl,
  fontClassName = ""
}: YerevanDashboardHeaderProps) {
  const [activeTab, setActiveTab] = useState<UtilityTab>("overview");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sections, setSections] = useState<YourCitySections>(DEFAULT_YOUR_CITY_SECTIONS);
  /** Dev-only local preview — never triggers geolocation, weather, or Firestore. */
  const [previewCountry, setPreviewCountry] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const greetingAnchorRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSections(readYourCitySections());
    const onSections = (e: Event) => {
      const detail = (e as CustomEvent<Partial<YourCitySections>>).detail;
      if (!detail) {
        setSections(readYourCitySections());
        return;
      }
      setSections({
        quote: detail.quote !== false,
        liveClock: detail.liveClock !== false,
        clocks: detail.clocks !== false,
        weather: detail.weather !== false
      });
    };
    const onOpenSettings = () => setSettingsOpen(true);
    window.addEventListener("dimad:cc-your-city-sections", onSections);
    window.addEventListener("dimad:open-city-settings", onOpenSettings);
    return () => {
      window.removeEventListener("dimad:cc-your-city-sections", onSections);
      window.removeEventListener("dimad:open-city-settings", onOpenSettings);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuOptions: MenuOption[] = [
    { id: "overview", label: "Overview", icon: <LayoutGrid className="w-3 h-3 text-amber-400" /> },
    { id: "logistics", label: "Logistics", icon: <Truck className="w-3 h-3 text-emerald-400" /> },
    { id: "emergency", label: "Emergency", icon: <ShieldAlert className="w-3 h-3 text-rose-400" /> },
    { id: "weather", label: "Forecast", icon: <CloudSun className="w-3 h-3 text-sky-400" /> },
    {
      id: "city-preferred",
      label: "City Preferred",
      icon: <Star className="w-3 h-3 text-violet-300" />,
      comingSoon: true
    }
  ];

  const currentOption = menuOptions.find((m) => m.id === activeTab) ?? menuOptions[0]!;
  const primaryClock = localClock;
  const worldClocks = clocks;
  const liveCountryLabel = String(coords.country || "").trim();
  const effectiveCountry = (IS_DEV && previewCountry != null ? previewCountry : liveCountryLabel).trim();
  const toolkit = resolveCountryToolkit(effectiveCountry);
  const programmedCity = String(coords.city || "").trim() || "Your City";
  const greetingCity =
    String(greetingPlaceName || "").trim() || programmedCity;
  const cityGreeting = getLocalGreeting(greetingCity, effectiveCountry || liveCountryLabel);
  const helloSource = helloOverride
    ? helloOverride
    : isCountryToolkitFallback(toolkit)
      ? cityGreeting.word
      : toolkit.hello;
  const greetingParts = parseToolkitHello(helloSource);
  const countryLabel = isCountryToolkitFallback(toolkit)
    ? effectiveCountry || liveCountryLabel
    : toolkit.country;
  const placeBadge = countryLabel ? `${greetingCity}, ${countryLabel}` : greetingCity;
  const countryFlag = flagEmojiFromIso2(toolkit.iso2);
  const logisticsTiles = buildLogisticsTiles(toolkit);
  const emergencyTel = toolkit.emergencyNumber.replace(/[^\d+]/g, "") || toolkit.emergencyNumber;

  const playfairStyle = fontClassName
    ? undefined
    : ({ fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif" } as React.CSSProperties);

  /** Inline layout only — Tailwind CDN does not reliably style React-island classes. */
  const shellStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    minHeight: 300,
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid rgba(30, 41, 59, 0.9)",
    background: "#0b0f17",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.45)"
  };
  const gridStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    gap: 28,
    minHeight: 300,
    padding: "16px 28px 30px",
    boxSizing: "border-box",
    width: "100%"
  };
  const colStyle: React.CSSProperties = {
    minWidth: 0,
    display: "flex",
    flexDirection: "column"
  };
  /** Matches compact controls row so quote/weather share the same vertical band. */
  const toolbarSpacerStyle: React.CSSProperties = {
    height: 32,
    flexShrink: 0
  };

  return (
    <div
      className={`w-full max-w-[1440px] mx-auto select-none ${fontClassName}`.trim()}
      style={{ width: "100%" }}
    >
      <div style={shellStyle}>
        {/* Instant dark base — previous photo stays; next city fades in slowly */}
        <CityHeaderBackdrop
          currentSrc={backdropCurrentSrc || backdropSrc}
          incomingSrc={backdropIncomingSrc}
          onIncomingLoaded={onBackdropIncomingLoaded}
          alt=""
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(9,13,22,0.95), rgba(9,13,22,0.72), rgba(9,13,22,0.88))"
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(9,13,22,0.96), rgba(9,13,22,0.25), rgba(9,13,22,0.55))"
          }}
        />
        <HeaderPhotoCredit
          photographerName={backdropPhotographerName}
          photographerUrl={backdropPhotographerUrl}
        />

        <div style={gridStyle}>
          <div
            style={{
              ...colStyle,
              flex: activeTab === "overview" ? "1.05 1 0" : "1.2 1 0",
              justifyContent: "space-between",
              gap: 14
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
              <button
                type="button"
                onClick={onOpenCityGuide}
                className="inline-flex items-center gap-1.5 w-fit px-2.5 py-0.5 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 hover:border-amber-400/40 transition"
              >
                {countryFlag ? (
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 12,
                      lineHeight: 1,
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center"
                    }}
                  >
                    {countryFlag}
                  </span>
                ) : null}
                <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-200 leading-none py-0.5">
                  {placeBadge}
                </span>
              </button>

              {IS_DEV ? (
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    maxWidth: "100%",
                    padding: "4px 8px",
                    borderRadius: 999,
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(251, 191, 36, 0.35)",
                    color: "#fbbf24",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase"
                  }}
                >
                  <span style={{ whiteSpace: "nowrap" }}>Dev country</span>
                  <select
                    aria-label="Dev country toolkit preview"
                    value={previewCountry ?? ""}
                    onChange={(e) => {
                      // Local preview only — no geolocation, weather, or Firestore.
                      setPreviewCountry(e.target.value || null);
                    }}
                    style={{
                      maxWidth: 160,
                      background: "rgba(2, 6, 23, 0.9)",
                      color: "#e2e8f0",
                      border: "1px solid rgba(148, 163, 184, 0.35)",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "normal",
                      textTransform: "none",
                      padding: "2px 4px"
                    }}
                  >
                    <option value="">Live location</option>
                    <optgroup label="Presets">
                      {DEV_COUNTRY_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="All toolkit countries">
                      {COUNTRY_TOOLKIT_LIST.map((entry) => (
                        <option key={entry.id} value={entry.country}>
                          {entry.country}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
              ) : null}
            </div>

            <div
              ref={greetingAnchorRef}
              style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}
            >
              <h1
                style={playfairStyle}
                className="text-5xl xl:text-[3.65rem] font-bold leading-[1.03] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-[#fde68a] via-[#f59e0b] to-[#d97706] drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)]"
              >
                {greetingParts.nativeScript ? (
                  <span
                    className="block not-italic font-semibold tracking-wide"
                    style={{
                      fontSize: "0.38em",
                      lineHeight: 1.2,
                      marginBottom: "0.18em",
                      opacity: 0.88,
                      letterSpacing: "0.02em"
                    }}
                  >
                    {greetingParts.nativeScript}
                  </span>
                ) : null}
                <span className="italic font-semibold block">{greetingParts.primary},</span>
                <span className="block">{greetingCity}</span>
              </h1>
              {needsManualCity ? (
                <button
                  type="button"
                  onClick={() => onManualCityOpenChange?.(true)}
                  style={{
                    alignSelf: "flex-start",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 11,
                    lineHeight: 1.4,
                    color: "#94a3b8",
                    maxWidth: 280
                  }}
                >
                  Please enable location services or{" "}
                  <span style={{ color: "#fbbf24", textDecoration: "underline" }}>select your city manually</span>.
                </button>
              ) : null}
              <LocalCityPicker
                open={manualCityOpen}
                onOpenChange={(v) => onManualCityOpenChange?.(v)}
                onPick={async (cityId) => {
                  setPreviewCountry(null);
                  if (onPinCuratedCity) return Boolean(await onPinCuratedCity(cityId));
                  return Boolean(await onPinCity?.(cityId));
                }}
                anchorRef={greetingAnchorRef}
              />
            </div>
          </div>

          {activeTab === "overview" ? (
            <div style={{ ...colStyle, flex: "1.15 1 0", justifyContent: "space-between", gap: 12 }}>
              <div style={toolbarSpacerStyle} aria-hidden="true" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                {sections.quote ? (
                <a
                  href="/dashboard/quotes"
                  target="_top"
                  className="relative rounded-xl bg-slate-950/55 backdrop-blur-md border border-white/10 p-5 shadow-inner block hover:border-amber-400/30 transition"
                  style={{ maxWidth: "100%", minWidth: 0 }}
                >
                  <span
                    style={playfairStyle}
                    className="absolute -top-4 left-4 text-5xl text-amber-400/80 leading-none select-none"
                  >
                    “
                  </span>
                  <blockquote
                    style={{
                      ...playfairStyle,
                      fontSize: "clamp(0.95rem, 1.05vw + 0.55rem, 1.22rem)",
                      fontStyle: "italic",
                      lineHeight: 1.45,
                      color: "#f1f5f9",
                      paddingTop: 4,
                      margin: 0,
                      overflowWrap: "anywhere",
                      wordBreak: "normal",
                      whiteSpace: "normal"
                    }}
                  >
                    “{quote.quote}”
                  </blockquote>
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                      display: "grid",
                      gridTemplateColumns: quote.context ? "minmax(0, 0.9fr) minmax(0, 1.1fr)" : "1fr",
                      gap: 10,
                      alignItems: "start",
                      minWidth: 0
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#fbbf24",
                        letterSpacing: "0.02em",
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                        lineHeight: 1.35
                      }}
                    >
                      — {quote.author}
                    </span>
                    {quote.context ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          color: "#94a3b8",
                          lineHeight: 1.35,
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          textAlign: "right"
                        }}
                      >
                        {quote.context}
                      </span>
                    ) : null}
                  </div>
                </a>
                ) : (
                  <div aria-hidden="true" style={{ minHeight: 120 }} />
                )}
              </div>
            </div>
          ) : null}

          <div
            style={{
              ...colStyle,
              flex: activeTab === "overview" ? "1.35 1 0" : "1.6 1 0",
              justifyContent: "space-between",
              gap: 12
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)",
                gap: 10,
                width: "100%",
                minHeight: 32,
                alignItems: "center"
              }}
            >
              <div aria-hidden="true" />
              <div className="flex items-center gap-1.5 min-w-0">
              <div ref={dropdownRef} className="relative min-w-0" style={{ flex: "1 1 auto" }}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-[#0e131f]/90 hover:bg-[#141b2b] backdrop-blur-md border border-amber-400/40 text-[11px] font-medium text-slate-100 shadow-lg transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    {currentOption.icon}
                    <span>{currentOption.label}</span>
                  </span>
                  {dropdownOpen ? (
                    <ChevronUp className="w-3 h-3 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  )}
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 mt-2 w-full min-w-[200px] rounded-xl bg-[#0d121d]/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl py-1.5 z-50">
                    {menuOptions.map((item) => {
                      const isSelected = !item.comingSoon && activeTab === item.id;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          disabled={item.comingSoon}
                          onClick={() => {
                            if (item.comingSoon || item.id === "city-preferred") return;
                            setActiveTab(item.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs transition-colors ${
                            item.comingSoon
                              ? "text-slate-500 cursor-default"
                              : isSelected
                                ? "bg-amber-500/15 text-amber-300 font-medium border-l-2 border-amber-400"
                                : "text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {item.icon}
                            <span className="truncate">{item.label}</span>
                          </span>
                          {item.comingSoon ? (
                            <span
                              style={{
                                flexShrink: 0,
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: "#fbbf24",
                                background: "rgba(251,191,36,0.12)",
                                border: "1px solid rgba(251,191,36,0.35)",
                                borderRadius: 999,
                                padding: "2px 6px",
                                lineHeight: 1.2
                              }}
                            >
                              Coming Soon
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                ref={settingsBtnRef}
                type="button"
                title="Location & temperature settings"
                onClick={() => setSettingsOpen(true)}
                className={`p-1.5 rounded-lg backdrop-blur-md border transition-colors shrink-0 ${
                  settingsOpen
                    ? "bg-amber-400/15 border-amber-400/50 text-amber-300"
                    : "bg-[#0e131f]/90 hover:bg-[#141b2b] border-slate-700/70 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              </div>
            </div>
            <CityHeaderSettings
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              anchorRef={settingsBtnRef}
              city={programmedCity}
              country={countryLabel}
              tzLabel={primaryClock.utcLabel}
              tempUnit={tempUnit}
              onTempUnitChange={onTempUnitChange}
              locationServicesEnabled={locationServicesEnabled}
              onLocationServicesChange={async (on) => {
                await onLocationServicesChange?.(on);
              }}
              onRefreshLocation={async () => {
                await onRefreshLocation?.();
              }}
              onPinCuratedCity={async (cityId) => {
                setPreviewCountry(null);
                return Boolean(await onPinCuratedCity?.(cityId));
              }}
              permissionState={permissionState}
            />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
              {activeTab === "overview" && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)",
                      gap: 10,
                      width: "100%"
                    }}
                  >
                    {sections.weather ? (
                    <div
                      className="rounded-xl backdrop-blur-md"
                      style={{
                        background: "rgba(13,18,29,0.85)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        padding: 14,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        minHeight: 92
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-white tracking-tight">
                          {displayTemp(weather?.temp, tempUnit)}
                        </span>
                        {weatherIcon(weather?.code ?? 2)}
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-medium text-slate-200">{weather?.label || "Loading…"}</p>
                        <p className="text-[11px] text-slate-400">
                          Feels {displayTemp(weather?.feels, tempUnit)} • H {displayTemp(weather?.hi, tempUnit)}
                        </p>
                      </div>
                    </div>
                    ) : (
                      <div aria-hidden="true" style={{ minHeight: 92 }} />
                    )}

                    {sections.liveClock ? (
                    <div
                      className="rounded-xl backdrop-blur-md"
                      style={{
                        background: "rgba(13,18,29,0.85)",
                        border: "1px solid rgba(251,191,36,0.3)",
                        padding: 14,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        minHeight: 92
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
                          {primaryClock.city.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-amber-300">
                          {primaryClock.utcLabel || "UTC"}
                        </span>
                      </div>
                      <div className="my-1">
                        <LiveClock
                          tz={primaryClock.tz}
                          mode="time"
                          className="text-2xl font-mono font-bold text-amber-400 tracking-tight"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <LiveClock tz={primaryClock.tz} mode="date" />
                        <span className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3 h-3 text-amber-400" /> Live
                        </span>
                      </div>
                    </div>
                    ) : (
                      <div aria-hidden="true" style={{ minHeight: 92 }} />
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      flexWrap: "nowrap",
                      alignItems: "flex-start",
                      justifyContent: "flex-end",
                      gap: 10,
                      width: "100%",
                      minWidth: 0,
                      minHeight: 72,
                      overflowX: "auto"
                    }}
                  >
                    {sections.clocks ? (
                      <>
                    {worldClocks.map((c) => (
                      <WorldClockDisc
                        key={c.id}
                        city={c.city}
                        tz={c.tz}
                        utcLabel={c.utcLabel}
                        size={42}
                        variant="stack"
                      />
                    ))}
                    <WorldCitiesPicker
                      open={citiesOpen}
                      onOpenChange={setCitiesOpen}
                      onSelectionChange={onCitiesChange}
                    >
                      <span
                        aria-hidden="true"
                        title="Add world clock"
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "999px",
                          border: "1.5px dashed rgba(251,191,36,0.55)",
                          background: citiesOpen
                            ? "rgba(251,191,36,0.12)"
                            : "rgba(13,18,29,0.75)",
                          color: "#fbbf24",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </span>
                    </WorldCitiesPicker>
                      </>
                    ) : null}
                  </div>
                </>
              )}

              {activeTab === "logistics" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {logisticsTiles.map((item) => {
                    const Icon = item.icon;
                    const iconClass = "w-4 h-4 text-amber-400";
                    const body = (
                      <>
                        <div>
                          <p className="text-xs font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400">{item.sub}</p>
                        </div>
                        <Icon className={iconClass} />
                      </>
                    );
                    const sharedClass =
                      "flex items-center justify-between px-3 py-2 rounded-xl bg-[#0d121d]/85 backdrop-blur-md border border-white/10 transition-all group";

                    if (item.href) {
                      return (
                        <a
                          key={item.title}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${sharedClass} hover:bg-[#151c2c] hover:border-amber-400/40`}
                        >
                          {body}
                        </a>
                      );
                    }

                    return (
                      <div
                        key={item.title}
                        className={sharedClass}
                        style={{ cursor: "default", opacity: item.sub === "None" ? 0.72 : 1 }}
                      >
                        {body}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "emergency" && (
                <div className="flex flex-col gap-2">
                  <a
                    href={`tel:${emergencyTel}`}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0d121d]/90 backdrop-blur-md border border-rose-500/30 hover:border-rose-400/50 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <PhoneCall className="w-4 h-4 text-rose-400" />
                      <div>
                        <p className="text-xs font-semibold text-slate-100">General Emergency</p>
                        <p className="text-[11px] text-slate-400">Police / Ambulance</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                      {toolkit.emergencyNumber}
                    </span>
                  </a>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {toolkit.safetyWing ? (
                      <a
                        href="https://safetywing.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0d121d]/85 backdrop-blur-md border border-white/10 hover:border-amber-400/40 transition"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-100">Travel Insurance</p>
                          <p className="text-[11px] text-slate-400">SafetyWing</p>
                        </div>
                        <HeartPulse className="w-4 h-4 text-amber-400" />
                      </a>
                    ) : null}
                    <a
                      href="https://www.embassypages.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0d121d]/85 backdrop-blur-md border border-white/10 hover:border-amber-400/40 transition"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-100 leading-snug pr-1">
                          Embassies and Consulates
                        </p>
                        <p className="text-[11px] text-slate-400">EmbassyPages</p>
                      </div>
                      <Landmark className="w-4 h-4 text-amber-400" />
                    </a>
                  </div>
                </div>
              )}

              {activeTab === "weather" && (
                <div className="rounded-xl bg-[#0d121d]/85 backdrop-blur-md border border-white/10 p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-white">{displayTemp(weather?.temp, tempUnit)}</span>
                      <div className="text-[11px] text-slate-400 leading-tight">
                        <p className="text-slate-200 font-medium">{weather?.label || "Loading…"}</p>
                        <p>
                          H {displayTemp(weather?.hi, tempUnit)} • L {displayTemp(weather?.lo, tempUnit)}
                        </p>
                      </div>
                    </div>
                    <div
                      className="text-[10px] text-slate-400"
                      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}
                    >
                      <span className="flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-sky-400" />{" "}
                        {weather?.humidity != null ? `${weather.humidity}%` : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wind className="w-3 h-3 text-slate-300" />{" "}
                        {weather ? formatWind(weather.wind, tempUnit) : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sunrise className="w-3 h-3 text-amber-400" /> {weather?.sunrise || "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sunset className="w-3 h-3 text-orange-400" /> {weather?.sunset || "—"}
                      </span>
                    </div>
                  </div>

                  <div
                    className="pt-1 border-t border-white/10"
                    style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6 }}
                  >
                    {(weather?.hourly?.length
                      ? weather.hourly
                      : Array.from({ length: 6 }, (_, i) => ({ label: "—", temp: NaN, code: 2 }))
                    ).map((slot, idx) => (
                      <div
                        key={`${slot.label}-${idx}`}
                        className="flex flex-col items-center py-1.5 px-1 rounded-lg bg-white/[0.03] border border-white/5"
                      >
                        <span className="text-[10px] text-slate-400">{slot.label}</span>
                        <span className="my-1">{weatherIcon(slot.code, "w-3.5 h-3.5 text-amber-400")}</span>
                        <span className="text-[11px] font-semibold text-slate-100">
                          {displayTemp(slot.temp, tempUnit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
