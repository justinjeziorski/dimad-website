"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ManualEntryModal from "@/components/revenue/ManualEntryModal";
import RevenueNav from "@/components/revenue/RevenueNav";
import { authFetch } from "@/lib/dimad-auth-client";
import { money } from "@/lib/revenue/ledgerEngine";
import { goRevenue } from "@/lib/revenue/nav";
import type { ManualLedgerInput, UnifiedTransaction } from "@/lib/revenue/types";
import { SNAPSHOT_THEME } from "@/lib/snapshot-theme";

type SortKey = "date" | "amount" | "type" | "platformLabel" | "merchantOrCustomer";

export default function ManualEntriesPage() {
  const [entries, setEntries] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "REVENUE" | "EXPENSE">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UnifiedTransaction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, res } = await authFetch("/api/revenue/manual");
      const list = Array.isArray((data as { entries?: UnifiedTransaction[] }).entries)
        ? ((data as { entries: UnifiedTransaction[] }).entries || [])
        : [];
      if (res.ok && list.length) {
        setEntries(list.filter((e) => e.source === "manual"));
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = entries.filter((e) => {
      if (typeFilter !== "ALL" && e.type !== typeFilter) return false;
      if (!q) return true;
      return (
        e.merchantOrCustomer?.toLowerCase().includes(q) ||
        e.platformLabel.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.notes || "").toLowerCase().includes(q)
      );
    });
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (sortKey === "amount") cmp = Number(av) - Number(bv);
      else if (sortKey === "date") cmp = Date.parse(String(av)) - Date.parse(String(bv));
      else cmp = String(av || "").localeCompare(String(bv || ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [entries, query, typeFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "date" || key === "amount" ? "desc" : "asc");
    }
  }

  async function saveEntry(input: ManualLedgerInput & { id?: string }) {
    const method = input.id ? "PATCH" : "POST";
    const { res, data } = await authFetch("/api/revenue/manual", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!res.ok || data.ok === false) {
      const local: UnifiedTransaction = {
        id: input.id || `local_${Date.now()}`,
        userId: "user",
        type: input.type,
        source: "manual",
        platformLabel: input.platformLabel || "Manual Entry",
        amount: input.amount,
        currency: "USD",
        category: input.category,
        isRecurring: Boolean(input.isRecurring),
        recurringInterval: input.recurringInterval,
        merchantOrCustomer: input.merchantOrCustomer,
        date: input.date,
        notes: input.notes,
        businessPersonal: "business"
      };
      setEntries((prev) => {
        if (input.id) return prev.map((row) => (row.id === input.id ? local : row));
        return [local, ...prev];
      });
      return;
    }
    const entry = data.entry as UnifiedTransaction;
    setEntries((prev) => {
      if (input.id) return prev.map((row) => (row.id === input.id ? entry : row));
      return [entry, ...prev];
    });
  }

  async function removeEntry(id: string) {
    if (!window.confirm("Delete this manual entry?")) return;
    try {
      await authFetch(`/api/revenue/manual?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {
      /* local remove anyway */
    }
    setEntries((prev) => prev.filter((row) => row.id !== id));
  }

  return (
    <DashboardShell
      kicker="Finance"
      title="Manual Entries"
      subtitle="Sort, filter, edit, and delete custom ledger rows. Source tags stay reusable across new entries."
      actions={
        <>
          <button type="button" style={btnStyle} onClick={() => goRevenue("/dashboard/revenue")}>
            ← Back to Revenue
          </button>
          <button
            type="button"
            style={btnStyle}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + New Entry
          </button>
        </>
      }
    >
      <RevenueNav active="manual" />

      <section style={panelStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter merchant, source, category…"
            style={inputStyle}
          />
          {(["ALL", "REVENUE", "EXPENSE"] as const).map((t) => (
            <button key={t} type="button" style={pill(typeFilter === t)} onClick={() => setTypeFilter(t)}>
              {t === "ALL" ? "All types" : t}
            </button>
          ))}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: SNAPSHOT_THEME.mute, textAlign: "left" }}>
                {(
                  [
                    ["date", "Date"],
                    ["type", "Type"],
                    ["merchantOrCustomer", "Merchant"],
                    ["platformLabel", "Source tag"],
                    ["amount", "Amount"]
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <th key={key} style={thStyle}>
                    <button type="button" onClick={() => toggleSort(key)} style={sortBtn}>
                      {label}
                      {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={tdStyle}>
                    Loading…
                  </td>
                </tr>
              ) : visible.length ? (
                visible.map((row) => (
                  <tr key={row.id} style={{ borderTop: `1px solid ${SNAPSHOT_THEME.navyLine}` }}>
                    <td style={tdStyle}>{row.date.slice(0, 10)}</td>
                    <td style={tdStyle}>{row.type}</td>
                    <td style={tdStyle}>{row.merchantOrCustomer || "—"}</td>
                    <td style={tdStyle}>{row.platformLabel}</td>
                    <td style={tdStyle}>{money(row.amount)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          style={ghostBtn}
                          onClick={() => {
                            setEditing(row);
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button type="button" style={ghostBtn} onClick={() => void removeEntry(row.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={tdStyle}>
                    No manual entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ManualEntryModal
        open={modalOpen}
        initial={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={saveEntry}
      />
    </DashboardShell>
  );
}

const panelStyle: CSSProperties = {
  background: "rgba(17, 34, 64, 0.72)",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 16,
  padding: 16
};

const thStyle: CSSProperties = { padding: "8px 6px", fontWeight: 600 };
const tdStyle: CSSProperties = { padding: "10px 6px", color: SNAPSHOT_THEME.ink };

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

const ghostBtn: CSSProperties = {
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "transparent",
  color: SNAPSHOT_THEME.mute,
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 10,
  fontWeight: 700,
  cursor: "pointer"
};

const sortBtn: CSSProperties = {
  border: 0,
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
  padding: 0
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
