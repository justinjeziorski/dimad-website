"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WORLD_CLOCK_CITIES } from "@/lib/city/worldClockCities";
import { readSelectedClockIds, toggleSelectedClockId } from "@/lib/city/weather";

type WorldCitiesPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectionChange?: () => void;
  children: React.ReactNode;
};

type PanelPos = { top: number; left: number; width: number };

/**
 * Select-cities dropdown anchored to the world-clock "+" control.
 * Mirrors legacy WORLD_CLOCKS picker (search + checkboxes, max 3).
 */
export default function WorldCitiesPicker({
  open,
  onOpenChange,
  onSelectionChange,
  children
}: WorldCitiesPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [selected, setSelected] = useState<string[]>(() =>
    typeof window === "undefined" ? ["yerevan", "london", "new-york"] : readSelectedClockIds()
  );

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setPos(null);
      return;
    }
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(288, Math.max(240, window.innerWidth - 24));
      let left = rect.right - width;
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
      const panelH = panelRef.current?.offsetHeight || 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openDown = spaceBelow >= Math.min(panelH, 280) || spaceBelow > rect.top;
      const top = openDown ? rect.bottom + 8 : Math.max(12, rect.top - panelH - 8);
      setPos({ top, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, query, selected.length]);

  useEffect(() => {
    if (!open) return;
    setSelected(readSelectedClockIds());
    setQuery("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WORLD_CLOCK_CITIES;
    return WORLD_CLOCK_CITIES.filter(
      (c) =>
        c.city.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.tz.toLowerCase().includes(q)
    );
  }, [query]);

  const atCap = selected.length >= 3;

  const toggle = (id: string, on: boolean) => {
    const next = toggleSelectedClockId(id, on);
    setSelected(next);
    onSelectionChange?.();
    try {
      const w = window as unknown as {
        WORLD_CLOCKS?: { render?: () => void };
      };
      w.WORLD_CLOCKS?.render?.();
    } catch {
      /* ignore */
    }
  };

  const panel =
    open && pos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            role="listbox"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              borderRadius: 12,
              overflow: "hidden",
              zIndex: 9999,
              background: "rgba(13,18,29,0.97)",
              border: "1px solid rgba(51,65,85,0.85)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.55)"
            }}
          >
            <div
              style={{
                padding: 8,
                borderBottom: "1px solid rgba(51,65,85,0.7)",
                background: "rgba(15,23,42,0.9)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 8px",
                  borderRadius: 8,
                  border: "1px solid rgba(251,191,36,0.35)",
                  background: "#0b0f17"
                }}
              >
                <span style={{ color: "#fbbf24", fontSize: 10 }} aria-hidden="true">
                  ⌕
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search cities or timezones..."
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: "8px 0",
                    fontSize: 12,
                    color: "#f1f5f9"
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: "ui-monospace, monospace",
                  color: "#64748b",
                  padding: "6px 2px 0"
                }}
              >
                Up to 3 additional clocks · {selected.length}/3
              </div>
            </div>

            <div style={{ maxHeight: 240, overflowY: "auto", padding: 8 }}>
              {filtered.length === 0 ? (
                <div style={{ fontSize: 11, color: "#64748b", padding: "8px 4px" }}>No cities match</div>
              ) : (
                filtered.map((city, idx) => {
                  const prevGroup = idx > 0 ? filtered[idx - 1].group : "";
                  const showGroup = city.group !== prevGroup;
                  const checked = selected.includes(city.id);
                  const disabled = atCap && !checked;
                  return (
                    <div key={city.id}>
                      {showGroup ? (
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "rgba(251,191,36,0.8)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            padding: "8px 4px 2px"
                          }}
                        >
                          {city.group}
                        </div>
                      ) : null}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px",
                          borderRadius: 6,
                          cursor: disabled ? "default" : "pointer",
                          opacity: disabled ? 0.4 : 1
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) => toggle(city.id, e.target.checked)}
                          style={{ accentColor: "#fbbf24" }}
                        />
                        <span style={{ fontSize: 11, color: "#e2e8f0" }}>{city.city}</span>
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select cities"
        title="Select cities"
        style={{
          appearance: "none",
          background: "transparent",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          lineHeight: 0
        }}
      >
        {children}
      </button>
      {panel}
    </div>
  );
}
