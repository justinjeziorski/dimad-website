"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  CloudSun,
  Droplets,
  HeartPulse,
  Hospital,
  Landmark,
  LayoutGrid,
  PhoneCall,
  Plus,
  Settings,
  Shield,
  ShieldAlert,
  ShoppingCart,
  Smartphone,
  Sun,
  Sunrise,
  Sunset,
  Train,
  Truck,
  Utensils,
  Wind
} from "lucide-react";
import {
  formatWind,
  type CityCoords,
  type CityWeatherSnapshot,
  type TempUnit
} from "@/lib/city/weather";
import type { CityClockRow, CityQuote } from "@/hooks/useCityDashboardState";
import { getLocalGreeting } from "@/lib/city/localGreeting";
import CityHeaderBackdrop from "@/components/dashboard/CityHeaderBackdrop";
import LiveClock from "@/components/dashboard/LiveClock";
import WorldClockDisc from "@/components/dashboard/WorldClockDisc";
import WorldCitiesPicker from "@/components/dashboard/WorldCitiesPicker";
import LocalCityPicker from "@/components/dashboard/LocalCityPicker";
import CityHeaderSettings from "@/components/dashboard/CityHeaderSettings";

type UtilityTab = "overview" | "logistics" | "emergency" | "weather";

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
  needsManualCity?: boolean;
  manualCityOpen?: boolean;
  onManualCityOpenChange?: (open: boolean) => void;
  onPinCity?: (query: string) => Promise<boolean> | boolean;
  locationServicesEnabled?: boolean;
  onLocationServicesChange?: (on: boolean) => void | Promise<void>;
  permissionState?: PermissionState | "unsupported" | "unknown";
  onRefreshLocation?: () => void | Promise<void>;
  backdropSrc?: string;
  fontClassName?: string;
};

const LOGISTICS = [
  { title: "Rideshare", sub: "YandexGo", href: "https://go.yandex/en_am/", icon: Car },
  { title: "Food Delivery", sub: "YandexEats", href: "https://eats.yandex.com/", icon: Utensils },
  { title: "Groceries", sub: "YandexEats", href: "https://eats.yandex.com/", icon: ShoppingCart },
  { title: "Public Transit", sub: "Metro & Bus", href: "https://yandex.com/metro/yerevan", icon: Train },
  { title: "VPN", sub: "NordVPN", href: "https://nordvpn.com/", icon: Shield },
  { title: "eSIM", sub: "Airalo", href: "https://www.airalo.com/", icon: Smartphone }
] as const;

function displayTemp(value: number | null | undefined, unit: TempUnit) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}°${unit}`;
}

function weatherIcon(code: number, className = "w-5 h-5 text-amber-400") {
  if (code === 0 || code === 1) return <Sun className={className} />;
  return <CloudSun className={className} />;
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
  needsManualCity = false,
  manualCityOpen = false,
  onManualCityOpenChange,
  onPinCity,
  locationServicesEnabled = true,
  onLocationServicesChange,
  permissionState = "unknown",
  onRefreshLocation,
  backdropSrc = "",
  fontClassName = ""
}: YerevanDashboardHeaderProps) {
  const [activeTab, setActiveTab] = useState<UtilityTab>("overview");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const greetingAnchorRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuOptions: { id: UtilityTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <LayoutGrid className="w-4 h-4 text-amber-400" /> },
    { id: "logistics", label: "Logistics", icon: <Truck className="w-4 h-4 text-emerald-400" /> },
    { id: "emergency", label: "Emergency", icon: <ShieldAlert className="w-4 h-4 text-rose-400" /> },
    { id: "weather", label: "Forecast", icon: <CloudSun className="w-4 h-4 text-sky-400" /> }
  ];

  const currentOption = menuOptions.find((m) => m.id === activeTab)!;
  const primaryClock = localClock;
  const worldClocks = clocks;
  const countryLabel = String(coords.country || "").trim();
  const greeting = getLocalGreeting(coords.city, coords.country);
  const cityName = greeting.city || coords.city || "Your City";
  const placeBadge = countryLabel ? `${cityName}, ${countryLabel}` : cityName;

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
    padding: "22px 28px",
    boxSizing: "border-box",
    width: "100%"
  };
  const colStyle: React.CSSProperties = {
    minWidth: 0,
    display: "flex",
    flexDirection: "column"
  };
  /** Matches controls row so quote/weather share the same vertical band. */
  const toolbarSpacerStyle: React.CSSProperties = {
    height: 44,
    flexShrink: 0
  };

  return (
    <div
      className={`w-full max-w-[1440px] mx-auto select-none ${fontClassName}`.trim()}
      style={{ width: "100%" }}
    >
      <div style={shellStyle}>
        {/* Instant dark base — photo fades in on top when Cache API / network resolves */}
        <CityHeaderBackdrop src={backdropSrc} alt="" />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(9,13,22,0.95), rgba(9,13,22,0.7), rgba(9,13,22,0.85))"
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(9,13,22,0.95), transparent, rgba(9,13,22,0.5))"
          }}
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
            <button
              type="button"
              onClick={onOpenCityGuide}
              className="inline-flex items-center gap-2.5 w-fit px-3 py-1 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 hover:border-amber-400/40 transition"
            >
              <span className="flex flex-col w-4 h-3 rounded-[2px] overflow-hidden shrink-0 shadow-sm">
                <span className="h-1 bg-[#D90012]" />
                <span className="h-1 bg-[#0033A0]" />
                <span className="h-1 bg-[#F2A800]" />
              </span>
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-200">
                {placeBadge}
              </span>
            </button>

            <div
              ref={greetingAnchorRef}
              style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}
            >
              <h1
                style={playfairStyle}
                className="text-5xl xl:text-[3.65rem] font-bold leading-[1.03] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-[#fde68a] via-[#f59e0b] to-[#d97706] drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)]"
              >
                <span className="italic font-semibold block">{greeting.word},</span>
                <span className="block">{cityName}</span>
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
                onPick={async (q) => Boolean(await onPinCity?.(q))}
                anchorRef={greetingAnchorRef}
              />
            </div>
          </div>

          {activeTab === "overview" ? (
            <div style={{ ...colStyle, flex: "1.15 1 0", justifyContent: "space-between", gap: 12 }}>
              <div style={toolbarSpacerStyle} aria-hidden="true" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
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
            <div className="flex items-center justify-end gap-2 flex-wrap" style={{ minHeight: 44 }}>
              <div ref={dropdownRef} className="relative" style={{ minWidth: 168, flex: "1 1 auto", maxWidth: 220 }}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[#0e131f]/90 hover:bg-[#141b2b] backdrop-blur-md border border-amber-400/40 text-sm font-medium text-slate-100 shadow-lg transition-all"
                >
                  <span className="flex items-center gap-2">
                    {currentOption.icon}
                    <span>{currentOption.label}</span>
                  </span>
                  {dropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-full min-w-[220px] rounded-xl bg-[#0d121d]/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl py-1.5 z-50">
                    {menuOptions.map((item) => {
                      const isSelected = activeTab === item.id;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors ${
                            isSelected
                              ? "bg-amber-500/15 text-amber-300 font-medium border-l-2 border-amber-400"
                              : "text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            {item.icon}
                            {item.label}
                          </span>
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
                className={`p-2.5 rounded-xl backdrop-blur-md border transition-colors ${
                  settingsOpen
                    ? "bg-amber-400/15 border-amber-400/50 text-amber-300"
                    : "bg-[#0e131f]/90 hover:bg-[#141b2b] border-slate-700/70 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
              <CityHeaderSettings
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                anchorRef={settingsBtnRef}
                city={cityName}
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
                onPinCity={async (q) => Boolean(await onPinCity?.(q))}
                permissionState={permissionState}
              />
            </div>

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
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30">
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
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      minWidth: 0
                    }}
                  >
                    {worldClocks.map((c) => (
                      <WorldClockDisc
                        key={c.id}
                        city={c.city}
                        tz={c.tz}
                        utcLabel={c.utcLabel}
                        size={42}
                        variant="inline"
                      />
                    ))}
                    <WorldCitiesPicker
                      open={citiesOpen}
                      onOpenChange={setCitiesOpen}
                      onSelectionChange={onCitiesChange}
                    >
                      <span
                        aria-hidden="true"
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
                          cursor: "pointer"
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </span>
                    </WorldCitiesPicker>
                  </div>
                </>
              )}

              {activeTab === "logistics" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {LOGISTICS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.title}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0d121d]/85 hover:bg-[#151c2c] backdrop-blur-md border border-white/10 hover:border-amber-400/40 transition-all group"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400">{item.sub}</p>
                        </div>
                        <Icon
                          className={`w-4 h-4 ${
                            item.title === "VPN"
                              ? "text-emerald-400"
                              : item.title === "eSIM"
                                ? "text-sky-400"
                                : "text-amber-400"
                          }`}
                        />
                      </a>
                    );
                  })}
                </div>
              )}

              {activeTab === "emergency" && (
                <div className="flex flex-col gap-2">
                  <a
                    href="tel:112"
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
                      112 / 103
                    </span>
                  </a>

                  <a
                    href="tel:+37410318000"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0d121d]/90 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-400/50 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Hospital className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="text-xs font-semibold text-slate-100">City Hospital</p>
                        <p className="text-[11px] text-slate-400">Armenia Medical Center</p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-semibold text-emerald-400">+374 10 318000</span>
                  </a>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
