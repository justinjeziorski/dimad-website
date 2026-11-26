"use client";

import type { CSSProperties } from "react";
import type { ExecutiveBriefing } from "@/lib/finances/types";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";

type Props = {
  briefing: ExecutiveBriefing;
  syncing?: boolean;
};

export default function AIFinancialInsights({ briefing, syncing }: Props) {
  return (
    <section style={wrap} aria-label="AI financial insights">
      <div style={head}>
        <div>
          <div style={eyebrow}>AI Financial Intelligence</div>
          <h2 style={title}>{briefing.title}</h2>
        </div>
        <div style={meta}>
          {syncing ? "Refreshing ledger…" : "Live from ledger"}
        </div>
      </div>
      <ol style={list}>
        {briefing.bullets.map((bullet, i) => (
          <li key={i} style={item}>
            <span style={index}>{i + 1}</span>
            <p style={text}>{bullet}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const wrap: CSSProperties = {
  padding: "16px 18px",
  borderRadius: 14,
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "linear-gradient(135deg, var(--accent-gold-soft) 0%, var(--card-surface) 42%, var(--bg-card) 100%)"
};

const head: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 14
};

const eyebrow: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.gold
};

const title: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 16,
  fontWeight: 800,
  color: SNAPSHOT_THEME.ink
};

const meta: CSSProperties = {
  fontSize: 10,
  color: SNAPSHOT_THEME.mute,
  whiteSpace: "nowrap"
};

const list: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const item: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start"
};

const index: CSSProperties = {
  flex: "0 0 auto",
  width: 22,
  height: 22,
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  fontSize: 11,
  fontWeight: 800,
  color: SNAPSHOT_THEME.gold,
  background: SNAPSHOT_THEME.goldSoft,
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`
};

const text: CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.5,
  color: SNAPSHOT_THEME.ink
};
