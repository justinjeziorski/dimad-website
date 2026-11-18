"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usePlatformSync, type UsePlatformSyncResult } from "@/hooks/usePlatformSync";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";

const PlatformSyncContext = createContext<UsePlatformSyncResult | null>(null);

type Props = {
  children: ReactNode;
  /** Force boot-style sync (welcome preload). Also auto-detected for /workspace-boot. */
  bootMode?: boolean;
  autoStart?: boolean;
  force?: boolean;
};

/** Subtle corner indicator — never locks the dashboard. */
function BackgroundSyncHint({ syncing, detail }: { syncing: boolean; detail: string }) {
  if (!syncing) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 40,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        maxWidth: 280,
        padding: "8px 12px",
        borderRadius: 999,
        border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
        background: "rgba(7, 16, 31, 0.88)",
        color: SNAPSHOT_THEME.mute,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
        pointerEvents: "none"
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: SNAPSHOT_THEME.gold,
          boxShadow: `0 0 8px ${SNAPSHOT_THEME.gold}`,
          flexShrink: 0
        }}
      />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {detail || "Syncing latest data…"}
      </span>
    </div>
  );
}

export function PlatformSyncProvider({
  children,
  bootMode = false,
  autoStart = true,
  force = false
}: Props) {
  const pathname = usePathname();
  const isBootRoute = bootMode || pathname === "/workspace-boot";

  const sync = usePlatformSync({
    autoStart,
    // Welcome boot forces a full handshake; dashboard pages never block on overlay.
    force: force || isBootRoute,
    showOverlayWhenStale: false,
    // No artificial minDuration — welcome gate already provides buffer time.
    minDurationMs: 0
  });

  return (
    <PlatformSyncContext.Provider value={sync}>
      {children}
      {!isBootRoute ? (
        <BackgroundSyncHint syncing={sync.syncing} detail="Syncing latest data…" />
      ) : null}
    </PlatformSyncContext.Provider>
  );
}

export function usePlatformSyncContext() {
  return useContext(PlatformSyncContext);
}
