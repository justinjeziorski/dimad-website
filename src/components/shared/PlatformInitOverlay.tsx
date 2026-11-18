"use client";

import type { CSSProperties } from "react";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";
import type { PlatformSyncPhaseId } from "@/lib/cache/platformSyncEngine";

type Props = {
  visible: boolean;
  progress: number;
  detail: string;
  phase?: PlatformSyncPhaseId;
  fromCache?: boolean;
  /** When true, overlay is translucent so cached UI can render underneath. */
  transparent?: boolean;
};

export default function PlatformInitOverlay({
  visible,
  progress,
  detail,
  phase = "gateway",
  fromCache = false,
  transparent = true
}: Props) {
  if (!visible) return null;

  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={progress < 1}
      data-phase={phase}
      style={{
        ...shellStyle,
        background: transparent ? "rgba(7, 16, 31, 0.72)" : SNAPSHOT_THEME.navy,
        backdropFilter: transparent ? "blur(10px)" : undefined,
        opacity: progress >= 1 ? 0 : 1,
        pointerEvents: progress >= 1 ? "none" : "auto",
        transition: "opacity 420ms ease"
      }}
    >
      <div style={cardStyle}>
        <p style={kickerStyle}>DIMADOS</p>
        <h1 style={titleStyle}>System Synchronization</h1>
        <p style={detailStyle}>{detail}</p>

        <div style={barTrackStyle} aria-hidden>
          <div
            style={{
              ...barFillStyle,
              width: `${pct}%`
            }}
          />
        </div>

        <div style={metaRowStyle}>
          <span style={metaStyle}>{pct}%</span>
          <span style={metaStyle}>
            {fromCache ? "Hydrated from secure cache" : "Live handshake in progress"}
          </span>
        </div>
      </div>
    </div>
  );
}

const shellStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "grid",
  placeItems: "center",
  padding: 24
};

const cardStyle: CSSProperties = {
  width: "min(420px, 100%)",
  background: "linear-gradient(165deg, rgba(17,34,64,0.96) 0%, rgba(10,25,47,0.98) 100%)",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 18,
  padding: "28px 26px 22px",
  boxShadow: "0 28px 60px rgba(0,0,0,0.45)"
};

const kickerStyle: CSSProperties = {
  margin: 0,
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.gold,
  fontWeight: 700
};

const titleStyle: CSSProperties = {
  margin: "10px 0 0",
  fontSize: 22,
  lineHeight: 1.2,
  fontWeight: 700,
  color: SNAPSHOT_THEME.ink,
  letterSpacing: "-0.02em"
};

const detailStyle: CSSProperties = {
  margin: "12px 0 0",
  minHeight: 40,
  fontSize: 13,
  lineHeight: 1.45,
  color: SNAPSHOT_THEME.mute
};

const barTrackStyle: CSSProperties = {
  marginTop: 22,
  height: 4,
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  overflow: "hidden"
};

const barFillStyle: CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: `linear-gradient(90deg, ${SNAPSHOT_THEME.gold} 0%, #f0d78c 100%)`,
  boxShadow: `0 0 16px ${SNAPSHOT_THEME.goldSoft}`,
  transition: "width 320ms ease"
};

const metaRowStyle: CSSProperties = {
  marginTop: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 12
};

const metaStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.mute,
  fontWeight: 600
};
