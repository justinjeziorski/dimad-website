"use client";

import type { CSSProperties } from "react";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";

function shimmerStyle(extra?: CSSProperties): CSSProperties {
  return {
    background: `linear-gradient(
      90deg,
      var(--bg-nested) 0%,
      var(--accent-gold-soft) 45%,
      var(--bg-nested) 100%
    )`,
    backgroundSize: "200% 100%",
    animation: "dimad-rev-shimmer 1.4s ease-in-out infinite",
    borderRadius: 10,
    ...extra
  };
}

export function RevenueSkeletonStyles() {
  return (
    <style>{`
      @keyframes dimad-rev-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12
      }}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "var(--card-surface)",
            border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
            borderRadius: 16,
            padding: 16,
            minHeight: 96
          }}
        >
          <div style={shimmerStyle({ height: 10, width: "42%", marginBottom: 14 })} />
          <div style={shimmerStyle({ height: 26, width: "68%", marginBottom: 10 })} />
          <div style={shimmerStyle({ height: 10, width: "34%" })} />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div
      style={{
        marginTop: 14,
        background: "var(--card-surface)",
        border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
        borderRadius: 16,
        padding: 16,
        minHeight: 280
      }}
      aria-hidden
    >
      <div style={shimmerStyle({ height: 12, width: 160, marginBottom: 18 })} />
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          height: 180,
          paddingTop: 12
        }}
      >
        {[42, 68, 55, 78, 46, 88, 62, 74, 51, 83, 59, 71].map((h, i) => (
          <div
            key={i}
            style={shimmerStyle({
              flex: 1,
              height: `${h}%`,
              borderRadius: "8px 8px 4px 4px"
            })}
          />
        ))}
      </div>
    </div>
  );
}

export function ExpenseRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gap: 8 }} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
            borderRadius: 12,
            padding: "12px 12px",
            background: "var(--bg-nested)"
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={shimmerStyle({ height: 12, width: "46%", marginBottom: 8 })} />
            <div style={shimmerStyle({ height: 10, width: "28%" })} />
          </div>
          <div style={shimmerStyle({ height: 14, width: 72 })} />
        </div>
      ))}
    </div>
  );
}

export function SyncPill({ syncing }: { syncing: boolean }) {
  if (!syncing) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: SNAPSHOT_THEME.mute,
        border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
        borderRadius: 999,
        padding: "5px 10px",
        background: "var(--bg-nested)"
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: SNAPSHOT_THEME.gold,
          boxShadow: `0 0 8px ${SNAPSHOT_THEME.gold}`,
          animation: "dimad-rev-shimmer 1.2s ease-in-out infinite"
        }}
      />
      Syncing latest data…
    </span>
  );
}
