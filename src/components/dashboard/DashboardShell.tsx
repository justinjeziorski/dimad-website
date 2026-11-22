"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";

export default function DashboardShell({
  kicker,
  title,
  subtitle,
  actions,
  children
}: {
  kicker: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [embedded, setEmbedded] = useState(false);
  useEffect(() => {
    setEmbedded(window.parent !== window);
  }, []);

  return (
    <main
      style={{
        minHeight: embedded ? undefined : "100vh",
        margin: 0,
        background: `radial-gradient(ellipse 90% 50% at 50% -10%, rgba(56, 189, 248, 0.06), transparent 55%), linear-gradient(180deg, ${SNAPSHOT_THEME.navySoft} 0%, ${SNAPSHOT_THEME.navy} 45%, #060911 100%)`,
        color: SNAPSHOT_THEME.ink,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        padding: embedded ? "18px 16px 28px" : "28px 20px 48px"
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: SNAPSHOT_THEME.gold }}>
              {kicker}
            </p>
            <h1 style={{ margin: "6px 0 4px", fontSize: 26, fontWeight: 700 }}>{title}</h1>
            <p style={{ margin: 0, color: SNAPSHOT_THEME.mute, fontSize: 12, maxWidth: 560 }}>{subtitle}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
            {actions}
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
