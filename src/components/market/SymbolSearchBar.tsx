"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import AddToListMenu from "@/components/market/AddToListMenu";
import { bareSymbol, type MarketList } from "@/lib/market-lists";

type SearchHit = {
  symbol: string;
  description: string;
  type: string;
};

type SymbolSearchBarProps = {
  lists: MarketList[];
  onSelect: (symbol: string) => void;
  onAdd: (listId: string, symbol: string) => void;
};

export default function SymbolSearchBar({ lists, onSelect, onAdd }: SymbolSearchBarProps) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (timer.current) window.clearTimeout(timer.current);
    if (q.length < 1) {
      setHits([]);
      setPending("");
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("search");
        const data = (await res.json()) as { results?: SearchHit[] };
        const rows = Array.isArray(data.results) ? data.results : [];
        setHits(rows);
        setOpen(true);
        setPending(rows[0]?.symbol || bareSymbol(q));
      } catch {
        const fallback = bareSymbol(q);
        setHits(fallback ? [{ symbol: fallback, description: "Add ticker", type: "Symbol" }] : []);
        setPending(fallback);
        setOpen(Boolean(fallback));
      }
    }, 280);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [query]);

  const active = bareSymbol(pending || query);

  return (
    <div ref={root} style={shell}>
      <div style={field}>
        <span style={icon}>⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(Boolean(query.trim()))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && active) {
              onSelect(active);
              setOpen(false);
            }
          }}
          placeholder="Search stocks (AAPL, Tesla, NVDA…)"
          style={input}
        />
        {active ? <AddToListMenu lists={lists} symbol={active} onAdd={onAdd} compact /> : null}
      </div>
      {open && hits.length ? (
        <div style={menu} role="listbox">
          {hits.map((hit) => (
            <div key={`${hit.symbol}-${hit.description}`} style={row}>
              <button
                type="button"
                style={hitBtn}
                onClick={() => {
                  setPending(hit.symbol);
                  onSelect(hit.symbol);
                  setQuery(hit.symbol);
                  setOpen(false);
                }}
              >
                <span style={sym}>{hit.symbol}</span>
                <span style={desc}>{hit.description}</span>
              </button>
              <AddToListMenu lists={lists} symbol={bareSymbol(hit.symbol)} onAdd={onAdd} compact />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const shell: CSSProperties = { position: "relative", minWidth: 0, flex: 1 };

const field: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#070A0F",
  border: "1px solid #1E293B",
  borderRadius: 10,
  padding: "6px 8px 6px 10px"
};

const icon: CSSProperties = { color: "#64748b", fontSize: 12 };

const input: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "transparent",
  border: 0,
  outline: "none",
  color: "#f8fafc",
  fontSize: 12
};

const menu: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  right: 0,
  zIndex: 45,
  background: "#0B0F17",
  border: "1px solid #1E293B",
  borderRadius: 10,
  overflow: "hidden",
  boxShadow: "0 18px 40px rgba(0,0,0,0.5)"
};

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 8px",
  borderBottom: "1px solid rgba(30, 41, 59, 0.8)"
};

const hitBtn: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "grid",
  textAlign: "left",
  background: "transparent",
  border: 0,
  color: "#e2e8f0",
  padding: "6px 4px",
  cursor: "pointer"
};

const sym: CSSProperties = {
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 12,
  fontWeight: 700,
  color: "#F59E0B"
};

const desc: CSSProperties = { fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
