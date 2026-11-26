import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import GrowthWorkspace from "@/components/growth/GrowthWorkspace";
import ControlCenterYouTube from "@/components/integrations/ControlCenterYouTube";
import MailerLiteWidget from "@/components/integrations/MailerLiteWidget";
import ControlCenterX from "@/components/integrations/ControlCenterX";

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

export function mountGrowthWorkspace(el: HTMLElement): void {
  mountInto(el, <GrowthWorkspace />);
}

export function mountYouTubeCard(el: HTMLElement): void {
  mountInto(el, <ControlCenterYouTube />);
}

export function mountMailerLiteCard(el: HTMLElement): void {
  mountInto(el, <MailerLiteWidget />);
}

export function mountXCard(el: HTMLElement): void {
  mountInto(el, <ControlCenterX />);
}

export function unmountGrowthIsland(el: HTMLElement): void {
  const root = roots.get(el);
  if (!root) return;
  root.unmount();
  roots.delete(el);
}

declare global {
  interface Window {
    __DIMAD_MOUNT_GROWTH_WORKSPACE?: typeof mountGrowthWorkspace;
    __DIMAD_MOUNT_YOUTUBE_CARD?: typeof mountYouTubeCard;
    __DIMAD_MOUNT_MAILERLITE_CARD?: typeof mountMailerLiteCard;
    __DIMAD_MOUNT_X_CARD?: typeof mountXCard;
    __DIMAD_UNMOUNT_GROWTH_ISLAND?: typeof unmountGrowthIsland;
  }
}

if (typeof window !== "undefined") {
  window.__DIMAD_MOUNT_GROWTH_WORKSPACE = mountGrowthWorkspace;
  window.__DIMAD_MOUNT_YOUTUBE_CARD = mountYouTubeCard;
  window.__DIMAD_MOUNT_MAILERLITE_CARD = mountMailerLiteCard;
  window.__DIMAD_MOUNT_X_CARD = mountXCard;
  window.__DIMAD_UNMOUNT_GROWTH_ISLAND = unmountGrowthIsland;
}
