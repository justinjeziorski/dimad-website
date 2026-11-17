"use client";

import { SNAPSHOT_THEME } from "@/lib/snapshot-theme";
import { goRevenue } from "@/lib/revenue/nav";

const TABS = [
  { href: "/dashboard/revenue", label: "Overview", id: "overview" },
  { href: "/dashboard/revenue/expenses", label: "Expenses", id: "expenses" }
] as const;

export default function RevenueNav({ active }: { active: "overview" | "manual" | "expenses" }) {
  return (
    <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <a
            key={tab.id}
            href={tab.href}
            onClick={(event) => {
              event.preventDefault();
              goRevenue(tab.href);
            }}
            style={{
              textDecoration: "none",
              border: `1px solid ${on ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.navyLine}`,
              background: on ? SNAPSHOT_THEME.goldSoft : "transparent",
              color: on ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.mute,
              borderRadius: 999,
              padding: "7px 12px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
