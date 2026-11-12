"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { MarketList } from "@/lib/market-lists";

type AddToListMenuProps = {
  lists: MarketList[];
  symbol: string;
  onAdd: (listId: string, symbol: string) => void;
  compact?: boolean;
};

export default function AddToListMenu({ lists, symbol, onAdd, compact }: AddToListMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={root} style={{ position: "relative", flex: "0 0 auto" }}>
      <button
        type="button"
        style={compact ? btnCompact : btn}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        Add to list
      </button>
      {open ? (
        <div style={menu} role="menu">
          {lists.map((list) => {
            const present = list.symbols.includes(symbol);
            return (
              <button
                key={list.id}
                type="button"
                role="menuitem"
                disabled={present}
                style={present ? itemDisabled : item}
                onClick={() => {
                  onAdd(list.id, symbol);
                  setOpen(false);
                }}
              >
                {list.name}
                {present ? <span style={{ color: "#64748b" }}>Added</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const btn: CSSProperties = {
  background: "rgba(245, 158, 11, 0.12)",
  color: "#F59E0B",
  border: "1px solid rgba(245, 158, 11, 0.45)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap"
};

const btnCompact: CSSProperties = {
  ...btn,
  padding: "4px 8px",
  fontSize: 10
};

const menu: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  zIndex: 40,
  minWidth: 180,
  background: "#0B0F17",
  border: "1px solid #1E293B",
  borderRadius: 10,
  overflow: "hidden",
  boxShadow: "0 16px 40px rgba(0,0,0,0.45)"
};

const item: CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  textAlign: "left",
  background: "transparent",
  color: "#e2e8f0",
  border: 0,
  padding: "8px 12px",
  fontSize: 12,
  cursor: "pointer"
};

const itemDisabled: CSSProperties = {
  ...item,
  color: "#64748b",
  cursor: "default"
};
