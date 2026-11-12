"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import {
  DEFAULT_LIST_ID,
  bareSymbol,
  defaultLists,
  newListId,
  readActiveListId,
  readLists,
  toTradingView,
  writeActiveListId,
  writeLists,
  type MarketList
} from "@/lib/market-lists";

type MarketQuote = {
  symbol: string;
  price: number | null;
  change: number | null;
  percent: number | null;
  high: number | null;
  low: number | null;
};

type MarketArticle = {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
  image: string;
};

type MarketPayload = {
  quotes: MarketQuote[];
  news: MarketArticle[];
};

type MarketTickerWidgetProps = {
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  lists: MarketList[];
  activeListId: string;
  onListsChange: (lists: MarketList[], activeListId?: string) => void;
  onActiveListChange: (id: string) => void;
};

type CtxMenu =
  | { kind: "list"; id: string; x: number; y: number }
  | { kind: "symbol"; symbol: string; x: number; y: number }
  | null;

const price = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatPercent(value: number | null) {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatWhen(unix: number) {
  if (!unix) return "";
  return new Date(unix * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function MarketTickerWidget({
  selectedSymbol,
  onSelect,
  lists,
  activeListId,
  onListsChange,
  onActiveListChange
}: MarketTickerWidgetProps) {
  const [data, setData] = useState<MarketPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [ctx, setCtx] = useState<CtxMenu>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);

  const activeList = lists.find((list) => list.id === activeListId) || lists[0];
  const symbolsKey = (activeList?.symbols || []).join(",");

  const quoteMap = useMemo(() => {
    const map = new Map<string, MarketQuote>();
    for (const quote of data?.quotes || []) map.set(quote.symbol, quote);
    return map;
  }, [data]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const query = symbolsKey ? `?symbols=${encodeURIComponent(symbolsKey)}` : "";
        const res = await fetch(`/api/market${query}`, { cache: "no-store" });
        if (!res.ok) throw new Error("market_unavailable");
        const payload = (await res.json()) as MarketPayload;
        if (!active) return;
        if (!Array.isArray(payload.quotes) || !Array.isArray(payload.news)) throw new Error("market_unavailable");
        setData(payload);
        setFailed(false);
      } catch {
        if (!active) return;
        setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    setLoading(true);
    void load();
    const timer = window.setInterval(load, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [symbolsKey]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (event.button !== 0) return;
      if (!menuRef.current?.contains(event.target as Node) && menuRef.current?.open) {
        menuRef.current.open = false;
      }
      setCtx(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (menuRef.current) menuRef.current.open = false;
        setCtx(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function createList() {
    const name = window.prompt("List name")?.trim();
    if (!name) return;
    const next = lists.concat({ id: newListId(), name, symbols: [] });
    onListsChange(next, next[next.length - 1].id);
    if (menuRef.current) menuRef.current.open = false;
  }

  function renameList(id: string) {
    if (id === DEFAULT_LIST_ID) return;
    const current = lists.find((list) => list.id === id);
    if (!current) return;
    const name = window.prompt("Rename list", current.name)?.trim();
    if (!name) return;
    onListsChange(lists.map((list) => (list.id === id ? { ...list, name } : list)));
    setCtx(null);
  }

  function deleteList(id: string) {
    if (id === DEFAULT_LIST_ID) return;
    const current = lists.find((list) => list.id === id);
    if (!current) return;
    if (!window.confirm(`Delete “${current.name}”?`)) return;
    const next = lists.filter((list) => list.id !== id);
    onListsChange(next, activeListId === id ? DEFAULT_LIST_ID : activeListId);
    setCtx(null);
  }

  function removeSymbol(symbol: string) {
    const bare = bareSymbol(symbol);
    onListsChange(
      lists.map((list) =>
        list.id === activeListId ? { ...list, symbols: list.symbols.filter((sym) => sym !== bare) } : list
      )
    );
    setCtx(null);
  }

  function openListMenu(event: ReactMouseEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();
    if (menuRef.current) menuRef.current.open = false;
    setCtx({ kind: "list", id, x: event.clientX, y: event.clientY });
  }

  function openSymbolMenu(event: ReactMouseEvent, symbol: string) {
    event.preventDefault();
    event.stopPropagation();
    if (menuRef.current) menuRef.current.open = false;
    setCtx({ kind: "symbol", symbol, x: event.clientX, y: event.clientY });
  }

  return (
    <div style={shell}>
      <style>{`
        @keyframes market-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .market-scroll { scrollbar-width: thin; scrollbar-color: #334155 transparent; }
        .market-scroll::-webkit-scrollbar { width: 6px; }
        .market-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 999px; }
        .market-list-menu > summary { list-style: none; }
        .market-list-menu > summary::-webkit-details-marker { display: none; }
      `}</style>

      <section style={panel} aria-label="Watchlist">
        <div style={panelHead}>
          <details
            ref={menuRef}
            className="market-list-menu"
            style={{ position: "relative", minWidth: 0, flex: 1 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <summary style={listToggle}>
              <span style={listTitle}>{activeList?.name || "Watchlist"}</span>
              <span style={{ color: "#64748b" }}>▾</span>
            </summary>
            <div style={dropdown} role="menu">
              {lists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  role="menuitem"
                  style={list.id === activeListId ? dropdownItemActive : dropdownItem}
                  onClick={() => {
                    onActiveListChange(list.id);
                    if (menuRef.current) menuRef.current.open = false;
                  }}
                  onContextMenu={(event) => openListMenu(event, list.id)}
                >
                  <span>{list.name}</span>
                  <span style={{ color: "#64748b" }}>{list.symbols.length}</span>
                </button>
              ))}
            </div>
          </details>
          <button
            type="button"
            style={addListBtn}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={createList}
            title="Create list"
          >
            + List
          </button>
        </div>

        <div className="market-scroll" style={cardScroller} aria-busy={loading}>
          {loading && !data
            ? Array.from({ length: 6 }, (_, index) => <span key={index} style={skeletonCard} />)
            : (activeList?.symbols || []).map((sym) => {
                const quote = quoteMap.get(sym);
                const tv = toTradingView(sym);
                const active = selectedSymbol === tv || bareSymbol(selectedSymbol) === sym;
                const up = (quote?.percent ?? 0) >= 0;
                return (
                  <button
                    key={sym}
                    type="button"
                    style={active ? cardActive : card}
                    aria-pressed={active}
                    onClick={() => onSelect(tv)}
                    onContextMenu={(event) => openSymbolMenu(event, sym)}
                  >
                    <span style={symbolRow}>
                      <span style={symbol}>{sym}</span>
                      <span style={up ? badgeUp : badgeDown}>{formatPercent(quote?.percent ?? null)}</span>
                    </span>
                    <span style={quotePrice}>{quote?.price == null ? "—" : price.format(quote.price)}</span>
                    <span style={range}>
                      {quote?.high == null || quote?.low == null
                        ? "—"
                        : `H ${price.format(quote.high)} · L ${price.format(quote.low)}`}
                    </span>
                  </button>
                );
              })}
          {!loading && activeList && !activeList.symbols.length ? (
            <p style={fallback}>This list is empty. Search a ticker or use Add to list.</p>
          ) : null}
        </div>
        {failed ? <p style={fallback}>Quotes are temporarily unavailable.</p> : null}
      </section>

      <section style={panel} aria-label="Market news">
        <div style={panelHeadStatic}>Market news</div>
        <div className="market-scroll" style={newsList}>
          {loading && !data
            ? Array.from({ length: 5 }, (_, index) => <span key={index} style={skeletonNews} />)
            : (data?.news ?? []).map((article) => {
                const body = (
                  <>
                    {article.image ? <img src={article.image} alt="" style={thumb} /> : <span style={thumbFallback} />}
                    <span style={articleCopy}>
                      <span style={headline}>{article.headline}</span>
                      <span style={source}>
                        {article.source}
                        {article.datetime ? ` · ${formatWhen(article.datetime)}` : ""}
                      </span>
                    </span>
                  </>
                );
                return article.url ? (
                  <a key={article.id || article.headline} href={article.url} target="_blank" rel="noreferrer" style={articleRow}>
                    {body}
                  </a>
                ) : (
                  <div key={article.id || article.headline} style={articleRow}>
                    {body}
                  </div>
                );
              })}
          {!loading && !failed && data && !data.news.length ? <p style={fallback}>No market headlines right now.</p> : null}
          {!loading && failed && !data ? <p style={fallback}>News is temporarily unavailable.</p> : null}
        </div>
      </section>

      {ctx ? (
        <div
          style={{ ...contextMenu, left: Math.min(ctx.x, window.innerWidth - 180), top: Math.min(ctx.y, window.innerHeight - 120) }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {ctx.kind === "list" ? (
            ctx.id === DEFAULT_LIST_ID ? (
              <div style={contextMuted}>Default watchlist</div>
            ) : (
              <>
                <button type="button" style={contextItem} onClick={() => renameList(ctx.id)}>
                  Rename
                </button>
                <button type="button" style={contextDanger} onClick={() => deleteList(ctx.id)}>
                  Delete
                </button>
              </>
            )
          ) : (
            <button type="button" style={contextDanger} onClick={() => removeSymbol(ctx.symbol)}>
              Remove
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function useMarketLists() {
  // Keep the first client render identical to the server (default list only),
  // then load homemade lists from localStorage after mount to avoid hydration mismatches.
  const [lists, setLists] = useState<MarketList[]>(() => defaultLists());
  const [activeListId, setActiveListId] = useState(DEFAULT_LIST_ID);

  useEffect(() => {
    const next = readLists();
    setLists(next);
    setActiveListId(readActiveListId(next));
  }, []);

  function persist(next: MarketList[], nextActive?: string) {
    writeLists(next);
    setLists(next);
    if (nextActive) {
      writeActiveListId(nextActive);
      setActiveListId(nextActive);
    }
  }

  function setActive(id: string) {
    writeActiveListId(id);
    setActiveListId(id);
  }

  function addSymbol(listId: string, symbol: string) {
    const bare = bareSymbol(symbol);
    if (!bare) return;
    const next = lists.map((list) => {
      if (list.id !== listId) return list;
      if (list.symbols.includes(bare)) return list;
      return { ...list, symbols: [bare, ...list.symbols] };
    });
    persist(next, listId);
  }

  return {
    lists,
    activeListId,
    setActiveListId: setActive,
    persist,
    addSymbol
  };
}

const shell: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(168px, 200px) minmax(240px, 1fr)",
  gap: 12,
  height: "100%",
  minHeight: 0,
  color: "#e2e8f0",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
};

const panel: CSSProperties = {
  background: "#0B0F17",
  border: "1px solid #1E293B",
  borderRadius: 12,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  minWidth: 0
};

const panelHead: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 8px 8px 10px",
  borderBottom: "1px solid #1E293B"
};

const panelHeadStatic: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #1E293B",
  color: "#F59E0B",
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase"
};

const listToggle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  background: "transparent",
  border: 0,
  color: "#F59E0B",
  padding: 0,
  cursor: "pointer",
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  listStyle: "none"
};

const listTitle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const addListBtn: CSSProperties = {
  flex: "0 0 auto",
  background: "rgba(245, 158, 11, 0.12)",
  color: "#F59E0B",
  border: "1px solid rgba(245, 158, 11, 0.4)",
  borderRadius: 7,
  padding: "4px 8px",
  fontSize: 10,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap"
};

const dropdown: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  zIndex: 50,
  background: "#070A0F",
  border: "1px solid #1E293B",
  borderRadius: 10,
  overflow: "hidden",
  boxShadow: "0 16px 36px rgba(0,0,0,0.5)"
};

const dropdownItem: CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  textAlign: "left",
  background: "transparent",
  color: "#e2e8f0",
  border: 0,
  padding: "8px 10px",
  fontSize: 12,
  cursor: "pointer"
};

const dropdownItemActive: CSSProperties = {
  ...dropdownItem,
  background: "rgba(245, 158, 11, 0.1)",
  color: "#F59E0B"
};

const cardScroller: CSSProperties = {
  overflowY: "auto",
  display: "grid",
  alignContent: "start",
  gap: 6,
  padding: 8,
  minHeight: 0
};

const card: CSSProperties = {
  display: "grid",
  gap: 2,
  textAlign: "left",
  background: "#070A0F",
  color: "#e2e8f0",
  border: "1px solid #1E293B",
  borderRadius: 8,
  padding: "8px 10px",
  cursor: "pointer"
};

const cardActive: CSSProperties = {
  ...card,
  borderColor: "#F59E0B",
  background: "rgba(245, 158, 11, 0.08)"
};

const symbolRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8
};

const symbol: CSSProperties = {
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 12,
  fontWeight: 700,
  color: "#f8fafc"
};

const quotePrice: CSSProperties = {
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 13,
  color: "#f8fafc"
};

const range: CSSProperties = { fontSize: 10, color: "#64748b" };

const badgeUp: CSSProperties = {
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  fontSize: 10,
  fontWeight: 700,
  color: "#10B981",
  background: "rgba(16, 185, 129, 0.12)",
  borderRadius: 999,
  padding: "2px 6px"
};

const badgeDown: CSSProperties = {
  ...badgeUp,
  color: "#EF4444",
  background: "rgba(239, 68, 68, 0.12)"
};

const newsList: CSSProperties = {
  overflowY: "auto",
  display: "grid",
  alignContent: "start",
  gap: 2,
  padding: 6,
  minHeight: 0
};

const articleRow: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  padding: 6,
  borderRadius: 8,
  textDecoration: "none",
  color: "inherit"
};

const thumb: CSSProperties = {
  width: 48,
  height: 34,
  objectFit: "cover",
  borderRadius: 6,
  flex: "0 0 auto",
  background: "#1E293B"
};

const thumbFallback: CSSProperties = { ...thumb };

const articleCopy: CSSProperties = { display: "grid", gap: 2, minWidth: 0 };

const headline: CSSProperties = { fontSize: 12, lineHeight: 1.35, color: "#f8fafc" };

const source: CSSProperties = { fontSize: 10, color: "#94a3b8" };

const fallback: CSSProperties = { margin: 0, padding: "8px 10px 12px", color: "#94a3b8", fontSize: 12 };

const skeletonCard: CSSProperties = {
  height: 58,
  borderRadius: 8,
  background: "#1E293B",
  animation: "market-pulse 1.2s ease-in-out infinite"
};

const skeletonNews: CSSProperties = {
  height: 52,
  borderRadius: 8,
  background: "#1E293B",
  animation: "market-pulse 1.2s ease-in-out infinite"
};

const contextMenu: CSSProperties = {
  position: "fixed",
  zIndex: 80,
  minWidth: 150,
  background: "#070A0F",
  border: "1px solid #1E293B",
  borderRadius: 10,
  overflow: "hidden",
  boxShadow: "0 18px 40px rgba(0,0,0,0.55)"
};

const contextItem: CSSProperties = {
  width: "100%",
  textAlign: "left",
  background: "transparent",
  color: "#e2e8f0",
  border: 0,
  padding: "8px 12px",
  fontSize: 12,
  cursor: "pointer"
};

const contextDanger: CSSProperties = { ...contextItem, color: "#EF4444" };

const contextMuted: CSSProperties = { ...contextItem, color: "#64748b", cursor: "default" };
