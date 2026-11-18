"use client";

import { goFinances } from "@/lib/finances/nav";
import { goRevenue } from "@/lib/revenue/nav";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";

const TABS = [
  { href: "/dashboard/finances", label: "Command Center", id: "finances", kind: "finances" as const },
  { href: "/dashboard/revenue/expenses", label: "Expenses", id: "expenses", kind: "revenue" as const }
];

export default function FinancesNav({
  active
}: {
  active: "finances" | "expenses";
}) {
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
              if (tab.kind === "finances") goFinances(tab.href);
              else goRevenue(tab.href);
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
