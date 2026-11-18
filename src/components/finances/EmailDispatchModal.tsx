"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { dispatchFinanceEmail } from "@/lib/finances/exportUtils";
import type { ExecutiveBriefing } from "@/lib/finances/types";
import { money } from "@/lib/finances/ledgerEngine";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";

type Props = {
  open: boolean;
  onClose: () => void;
  periodLabel: string;
  kpis: {
    grossRevenue: number;
    netProfit: number;
    marginPct: number;
    mrr: number;
    monthlyRecurringBurn: number;
  };
  briefing: ExecutiveBriefing;
};

export default function EmailDispatchModal({
  open,
  onClose,
  periodLabel,
  kpis,
  briefing
}: Props) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(`DIMAD Finances — ${periodLabel}`);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const email = to.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    dispatchFinanceEmail({
      to: email,
      subject: subject.trim() || `DIMAD Finances — ${periodLabel}`,
      periodLabel,
      kpis: {
        grossRevenue: kpis.grossRevenue,
        netRevenue: kpis.grossRevenue,
        totalExpenses: 0,
        netProfit: kpis.netProfit,
        marginPct: kpis.marginPct,
        mrr: kpis.mrr,
        oneTimeRevenue: 0,
        monthlyRecurringBurn: kpis.monthlyRecurringBurn
      },
      briefing
    });
    onClose();
  };

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Email financial snapshot">
      <form style={panel} onSubmit={onSubmit}>
        <div style={head}>
          <h3 style={{ margin: 0, fontSize: 16, color: SNAPSHOT_THEME.ink }}>
            Email financial snapshot
          </h3>
          <button type="button" onClick={onClose} style={closeBtn} aria-label="Close">
            ×
          </button>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: SNAPSHOT_THEME.mute, lineHeight: 1.45 }}>
          Sends a structured snapshot via your mail client to co-founders, investors, or tax
          accountants. Preview includes Gross {money(kpis.grossRevenue)} · Net{" "}
          {money(kpis.netProfit)}.
        </p>
        <label style={label}>
          Recipient
          <input
            type="email"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="cfo@example.com"
            style={input}
          />
        </label>
        <label style={label}>
          Subject
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={input}
          />
        </label>
        {error ? <div style={{ color: SNAPSHOT_THEME.danger, fontSize: 12 }}>{error}</div> : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={ghost}>
            Cancel
          </button>
          <button type="submit" style={primary}>
            Open mail draft
          </button>
        </div>
      </form>
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  background: "rgba(4,10,20,0.72)",
  display: "grid",
  placeItems: "center",
  padding: 16
};

const panel: CSSProperties = {
  width: "min(440px, 100%)",
  borderRadius: 14,
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: SNAPSHOT_THEME.navySoft,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const head: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const closeBtn: CSSProperties = {
  border: "none",
  background: "transparent",
  color: SNAPSHOT_THEME.mute,
  fontSize: 22,
  cursor: "pointer",
  lineHeight: 1
};

const label: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 11,
  color: SNAPSHOT_THEME.mute,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase"
};

const input: CSSProperties = {
  borderRadius: 10,
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "#07101f",
  color: SNAPSHOT_THEME.ink,
  padding: "9px 11px",
  fontSize: 13,
  fontFamily: "inherit",
  textTransform: "none",
  letterSpacing: "normal",
  fontWeight: 500
};

const ghost: CSSProperties = {
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "transparent",
  color: SNAPSHOT_THEME.mute,
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 12,
  cursor: "pointer"
};

const primary: CSSProperties = {
  border: `1px solid ${SNAPSHOT_THEME.gold}`,
  background: SNAPSHOT_THEME.goldSoft,
  color: SNAPSHOT_THEME.gold,
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer"
};
