"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import RevenueNav from "@/components/revenue/RevenueNav";
import { authFetch } from "@/lib/dimad-auth-client";
import { adaptLivePayloads } from "@/lib/revenue/adapters";
import { detectRecurringExpenses, generateMockLedger, money } from "@/lib/revenue/ledgerEngine";
import { goRevenue } from "@/lib/revenue/nav";
import type { UnifiedTransaction } from "@/lib/revenue/types";
import { SNAPSHOT_THEME } from "@/lib/snapshot-theme";

export default function RevenueExpensesPage() {
  const [rows, setRows] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [institution, setInstitution] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "recurring">("all");
  const [usingMock, setUsingMock] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, res } = await authFetch("/api/plaid/data");
      const payload = data as Record<string, unknown>;
      const isConnected = Boolean(payload.connected) && res.ok;
      setConnected(isConnected);
      setInstitution(String(payload.institutionName || ""));
      const live = adaptLivePayloads("user", { plaid: payload }).filter((r) => r.source === "plaid");
      if (live.length) {
        setRows(live);
        setUsingMock(false);
      } else if (isConnected) {
        setRows([]);
        setUsingMock(false);
      } else {
        const mock = generateMockLedger("demo").filter((r) => r.source === "plaid");
        setRows(mock);
        setUsingMock(true);
      }
    } catch {
      setRows(generateMockLedger("demo").filter((r) => r.source === "plaid"));
      setUsingMock(true);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const recurring = useMemo(() => detectRecurringExpenses(rows), [rows]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (!q) return true;
      return (
        (r.merchantOrCustomer || "").toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.platformLabel.toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  const total = filtered.reduce((a, r) => a + r.amount, 0);

  function togglePersonal(id: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const personal = !(row.excluded || row.businessPersonal === "personal");
        return {
          ...row,
          excluded: personal,
          businessPersonal: personal ? "personal" : "business"
        };
      })
    );
  }

  return (
    <DashboardShell
      kicker="Finance"
      title="Expenses"
      subtitle="Plaid-synced bank expenses and detected recurring subscriptions. Mark rows Business or Excluded/Personal."
      actions={
        <>
          <button type="button" style={btnStyle} onClick={() => goRevenue("/dashboard/revenue")}>
            ← Back to Revenue
          </button>
          <button type="button" style={btnStyle} onClick={() => void load()}>
            Refresh Plaid
          </button>
        </>
      }
    >
      <RevenueNav active="expenses" />

      {usingMock ? (
        <p style={{ margin: "0 0 12px", color: SNAPSHOT_THEME.mute, fontSize: 11 }}>
          Demo Plaid expenses shown — connect Plaid in Settings → Integrations for live bank data.
        </p>
      ) : null}

      <section style={{ ...panelStyle, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={labelStyle}>Plaid connection</p>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {loading ? "…" : connected ? institution || "Connected bank" : "Not connected"}
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: SNAPSHOT_THEME.mute }}>
              {connected ? "Live expenses from linked accounts" : "Connect Plaid to replace demo spend"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={labelStyle}>Spend in view</p>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{loading ? "…" : money(total)}</div>
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter merchant or category…"
            style={inputStyle}
          />
          <button type="button" style={pill(tab === "all")} onClick={() => setTab("all")}>
            All expenses
          </button>
          <button type="button" style={pill(tab === "recurring")} onClick={() => setTab("recurring")}>
            Recurring
          </button>
        </div>

        {tab === "recurring" ? (
          <div style={{ display: "grid", gap: 8 }}>
            {recurring.length ? (
              recurring.map((r) => (
                <div key={r.merchant} style={rowCard}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{r.merchant}</strong>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: SNAPSHOT_THEME.mute }}>
                      {r.interval} · confidence {(r.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>{money(r.monthlyAmount)}/mo</div>
                    <div style={{ fontSize: 11, color: SNAPSHOT_THEME.mute }}>{money(r.annualizedAmount)}/yr</div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: SNAPSHOT_THEME.mute, fontSize: 12 }}>No recurring merchants detected.</p>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {loading ? (
              <p style={{ color: SNAPSHOT_THEME.mute, fontSize: 12 }}>Loading…</p>
            ) : filtered.length ? (
              filtered.map((row) => {
                const personal = row.excluded || row.businessPersonal === "personal";
                return (
                  <div key={row.id} style={rowCard}>
                    <div>
                      <strong style={{ fontSize: 13 }}>{row.merchantOrCustomer || row.platformLabel}</strong>
                      <p style={{ margin: "3px 0 0", fontSize: 11, color: SNAPSHOT_THEME.mute }}>
                        {row.date.slice(0, 10)} · {row.category} · {row.platformLabel}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <strong>{money(row.amount)}</strong>
                      <button type="button" style={pill(!personal)} onClick={() => togglePersonal(row.id)}>
                        {personal ? "Excluded / Personal" : "Business"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: SNAPSHOT_THEME.mute, fontSize: 12 }}>No Plaid expenses in view.</p>
            )}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}

const panelStyle: CSSProperties = {
  background: "rgba(17, 34, 64, 0.72)",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 16,
  padding: 16
};

const labelStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.gold,
  fontWeight: 700
};

const rowCard: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 12,
  padding: "10px 12px",
  background: "rgba(7,16,31,0.35)"
};

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 220,
  background: "#070A0F",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 10,
  padding: "8px 10px",
  color: SNAPSHOT_THEME.ink,
  font: "inherit",
  fontSize: 12
};

const btnStyle: CSSProperties = {
  border: `1px solid ${SNAPSHOT_THEME.gold}`,
  background: SNAPSHOT_THEME.goldSoft,
  color: SNAPSHOT_THEME.gold,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer"
};

function pill(active: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.navyLine}`,
    background: active ? SNAPSHOT_THEME.goldSoft : "transparent",
    color: active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.mute,
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer"
  };
}
