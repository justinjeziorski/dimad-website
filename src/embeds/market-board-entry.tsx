import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import MarketBoard from "@/components/market/MarketBoard";

const roots = new WeakMap<Element, Root>();

function mountInto(el: HTMLElement, node: ReactNode): void {
  if (!el) return;
  let root = roots.get(el);
  if (!root) {
    root = createRoot(el);
    roots.set(el, root);
  }
  root.render(node);
}

export function mountMarketBoard(el: HTMLElement): void {
  mountInto(el, <MarketBoard embedded />);
}

export function unmountMarketBoard(el: HTMLElement): void {
  const root = roots.get(el);
  if (!root) return;
  root.unmount();
  roots.delete(el);
}

declare global {
  interface Window {
    __DIMAD_MOUNT_MARKET_BOARD?: typeof mountMarketBoard;
    __DIMAD_UNMOUNT_MARKET_BOARD?: typeof unmountMarketBoard;
  }
}

if (typeof window !== "undefined") {
  window.__DIMAD_MOUNT_MARKET_BOARD = mountMarketBoard;
  window.__DIMAD_UNMOUNT_MARKET_BOARD = unmountMarketBoard;
}
