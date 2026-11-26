import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import FinancesCommandCenter from "@/components/finances/FinancesCommandCenter";

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

export function mountFinancesWorkspace(el: HTMLElement): void {
  mountInto(el, <FinancesCommandCenter />);
}

export function unmountFinancesWorkspace(el: HTMLElement): void {
  const root = roots.get(el);
  if (!root) return;
  root.unmount();
  roots.delete(el);
}

declare global {
  interface Window {
    __DIMAD_MOUNT_FINANCES_WORKSPACE?: typeof mountFinancesWorkspace;
    __DIMAD_UNMOUNT_FINANCES_WORKSPACE?: typeof unmountFinancesWorkspace;
  }
}

if (typeof window !== "undefined") {
  window.__DIMAD_MOUNT_FINANCES_WORKSPACE = mountFinancesWorkspace;
  window.__DIMAD_UNMOUNT_FINANCES_WORKSPACE = unmountFinancesWorkspace;
}
