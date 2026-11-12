export type MarketList = {
  id: string;
  name: string;
  symbols: string[];
};

export const DEFAULT_LIST_ID = "watchlist";
export const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA", "SPY", "AMZN"];
export const LISTS_KEY = "dimad_market_lists";
export const ACTIVE_LIST_KEY = "dimad_market_active_list";

export const EXCHANGES: Record<string, string> = {
  AAPL: "NASDAQ:AAPL",
  MSFT: "NASDAQ:MSFT",
  NVDA: "NASDAQ:NVDA",
  TSLA: "NASDAQ:TSLA",
  AMZN: "NASDAQ:AMZN",
  GOOGL: "NASDAQ:GOOGL",
  META: "NASDAQ:META",
  AMD: "NASDAQ:AMD",
  SPY: "AMEX:SPY",
  QQQ: "NASDAQ:QQQ"
};

export function bareSymbol(value: string) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";
  const parts = raw.split(":");
  return (parts[parts.length - 1] || raw).replace(/[^A-Z0-9.]/g, "");
}

export function toTradingView(symbol: string) {
  const bare = bareSymbol(symbol);
  return EXCHANGES[bare] || `NASDAQ:${bare}`;
}

export function defaultLists(): MarketList[] {
  return [{ id: DEFAULT_LIST_ID, name: "Watchlist", symbols: [...DEFAULT_SYMBOLS] }];
}

export function readLists(): MarketList[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LISTS_KEY) || "null");
    if (!Array.isArray(parsed) || !parsed.length) return defaultLists();
    const cleaned = parsed
      .map((entry) => ({
        id: String(entry?.id || ""),
        name: String(entry?.name || "").trim() || "List",
        symbols: Array.isArray(entry?.symbols)
          ? entry.symbols.map((sym: string) => bareSymbol(sym)).filter(Boolean)
          : []
      }))
      .filter((entry) => entry.id);
    if (!cleaned.some((entry) => entry.id === DEFAULT_LIST_ID)) {
      cleaned.unshift(defaultLists()[0]);
    } else {
      cleaned.sort((a, b) => (a.id === DEFAULT_LIST_ID ? -1 : b.id === DEFAULT_LIST_ID ? 1 : 0));
    }
    return cleaned;
  } catch {
    return defaultLists();
  }
}

export function writeLists(lists: MarketList[]) {
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
}

export function readActiveListId(lists: MarketList[]) {
  const saved = localStorage.getItem(ACTIVE_LIST_KEY) || DEFAULT_LIST_ID;
  return lists.some((list) => list.id === saved) ? saved : DEFAULT_LIST_ID;
}

export function writeActiveListId(id: string) {
  localStorage.setItem(ACTIVE_LIST_KEY, id);
}

export function newListId() {
  return `list_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
