import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import RevenueSnapshotCard from "@/components/snapshots/RevenueSnapshotCard";
import GrowthSnapshotCard from "@/components/snapshots/GrowthSnapshotCard";

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

export function mountRevenueSnapshot(el: HTMLElement): void {
  mountInto(el, <RevenueSnapshotCard embedded />);
}

export function mountGrowthSnapshot(el: HTMLElement): void {
  mountInto(el, <GrowthSnapshotCard embedded />);
}

export function unmountSnapshot(el: HTMLElement): void {
  const root = roots.get(el);
  if (!root) return;
  root.unmount();
  roots.delete(el);
}

declare global {
  interface Window {
    __DIMAD_MOUNT_REVENUE_SNAPSHOT?: typeof mountRevenueSnapshot;
    __DIMAD_MOUNT_GROWTH_SNAPSHOT?: typeof mountGrowthSnapshot;
    __DIMAD_UNMOUNT_SNAPSHOT?: typeof unmountSnapshot;
  }
}

if (typeof window !== "undefined") {
  window.__DIMAD_MOUNT_REVENUE_SNAPSHOT = mountRevenueSnapshot;
  window.__DIMAD_MOUNT_GROWTH_SNAPSHOT = mountGrowthSnapshot;
  window.__DIMAD_UNMOUNT_SNAPSHOT = unmountSnapshot;
}
