"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  DIMAD_TIMEFRAME_LABELS,
  DIMAD_TIMEFRAMES,
  type CustomDateRange,
  type DimadTimeframe
} from "@/lib/utils/timeframeFilter";

type Props = {
  value: DimadTimeframe;
  customRange: CustomDateRange;
  onChange: (timeframe: DimadTimeframe) => void;
  onCustomRangeChange: (range: CustomDateRange) => void;
  /** Optional compact styling for nested chart toolbars */
  compact?: boolean;
};

export default function TimeRangeSelector({
  value,
  customRange,
  onChange,
  onCustomRangeChange,
  compact = false
}: Props) {
  const [open, setOpen] = useState(value === "Custom");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value === "Custom") setOpen(true);
  }, [value]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        if (value !== "Custom") setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [value]);

  return (
    <div ref={rootRef} style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? 5 : 6, alignItems: "center" }}>
        {DIMAD_TIMEFRAMES.map((tf) => {
          const active = value === tf;
          return (
            <button
              key={tf}
              type="button"
              onClick={() => {
                onChange(tf);
                if (tf === "Custom") setOpen(true);
                else setOpen(false);
              }}
              style={pill(active, compact)}
            >
              {DIMAD_TIMEFRAME_LABELS[tf]}
            </button>
          );
        })}
      </div>

      {value === "Custom" || open ? (
        <div
          style={{
            display: value === "Custom" ? "flex" : "none",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid rgba(212,175,55,0.28)",
            background: "rgba(7,16,31,0.55)"
          }}
        >
          <label style={dateLabel}>
            Start
            <input
              type="date"
              value={customRange.startDate}
              onChange={(e) =>
                onCustomRangeChange({ ...customRange, startDate: e.target.value })
              }
              style={dateInput}
            />
          </label>
          <label style={dateLabel}>
            End
            <input
              type="date"
              value={customRange.endDate}
              onChange={(e) =>
                onCustomRangeChange({ ...customRange, endDate: e.target.value })
              }
              style={dateInput}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function pill(active: boolean, compact: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? "#D4AF37" : "rgba(212,175,55,0.22)"}`,
    background: active ? "#D4AF37" : "transparent",
    color: active ? "#0A192F" : "#8BA0B8",
    borderRadius: 999,
    padding: compact ? "5px 9px" : "6px 10px",
    fontSize: compact ? 10 : 11,
    fontWeight: active ? 700 : 600,
    cursor: "pointer",
    letterSpacing: "0.02em"
  };
}

const dateLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  color: "#8BA0B8",
  fontWeight: 600
};

const dateInput: CSSProperties = {
  background: "#070A0F",
  border: "1px solid rgba(212,175,55,0.22)",
  borderRadius: 8,
  color: "#E8EEF7",
  padding: "5px 8px",
  font: "inherit",
  fontSize: 11
};
