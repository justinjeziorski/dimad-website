"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WORLD_CLOCK_CITIES } from "@/lib/city/worldClockCities";

type LocalCityPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (query: string) => Promise<boolean> | boolean;
  anchorRef?: React.RefObject<HTMLElement | null>;
};

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
      const width = Math.min(300, Math.max(240, window.innerWidth - 24));
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
    if (!q) return WORLD_CLOCK_CITIES.slice(0, 40);
    return WORLD_CLOCK_CITIES.filter(
      (c) =>
        c.city.toLowerCase().includes(q) ||
        c.tz.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [query]);

  const submit = async (value: string) => {
    if (!value.trim() || busy) return;
    setBusy(true);
    try {
      await onPick(value.trim());
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
            if (e.key === "Enter") void submit(query);
          }}
          placeholder="Search or type a city…"
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
          Pin your current city
        </div>
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto", padding: 6 }}>
        {filtered.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={busy}
            onClick={() => void submit(c.city)}
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
            {c.city}
            <span style={{ color: "#64748b", marginLeft: 8, fontSize: 10 }}>{c.group}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
