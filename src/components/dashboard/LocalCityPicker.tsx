"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CURATED_CITIES } from "@/data/cities";

type LocalCityPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives a curated city id from CURATED_CITIES. */
  onPick: (cityId: string) => Promise<boolean> | boolean;
  anchorRef?: React.RefObject<HTMLElement | null>;
};

/**
 * Manual place picker when location services need a pin / browse override.
 * Uses curated programmed cities (not world-clock catalog).
 */
export default function LocalCityPicker({ open, onOpenChange, onPick, anchorRef }: LocalCityPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const el = anchorRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.min(320, Math.max(260, window.innerWidth - 24));
      let left = rect.left;
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
      setPos({ top: rect.bottom + 8, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef?.current?.contains(t)) return;
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
  }, [open, onOpenChange, anchorRef]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURATED_CITIES.slice(0, 80);
    return CURATED_CITIES.filter((entry) => {
      const hay = [
        entry.city,
        entry.stateOrRegion,
        entry.country,
        ...entry.aliases
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    }).slice(0, 80);
  }, [query]);

  const submit = async (cityId: string) => {
    if (!cityId || busy) return;
    setBusy(true);
    try {
      await onPick(cityId);
    } finally {
      setBusy(false);
    }
  };

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
        borderRadius: 12,
        overflow: "hidden",
        background: "rgba(13,18,29,0.97)",
        border: "1px solid rgba(51,65,85,0.85)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.55)"
      }}
    >
      <div style={{ padding: 8, borderBottom: "1px solid rgba(51,65,85,0.7)" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered[0]) void submit(filtered[0].id);
          }}
          placeholder="Search curated cities…"
          disabled={busy}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#0b0f17",
            border: "1px solid rgba(251,191,36,0.35)",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            color: "#f1f5f9",
            outline: "none"
          }}
        />
        <div style={{ fontSize: 9, color: "#64748b", marginTop: 6, fontFamily: "ui-monospace, monospace" }}>
          Pin a programmed city
        </div>
      </div>
      <div style={{ maxHeight: 260, overflowY: "auto", padding: 6 }}>
        {filtered.map((entry) => (
          <button
            key={entry.id}
            type="button"
            disabled={busy}
            onClick={() => void submit(entry.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              color: "#e2e8f0",
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            {entry.city}
            <span style={{ color: "#64748b", marginLeft: 8, fontSize: 10 }}>
              {entry.stateOrRegion ? `${entry.stateOrRegion} · ` : ""}
              {entry.country}
            </span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
