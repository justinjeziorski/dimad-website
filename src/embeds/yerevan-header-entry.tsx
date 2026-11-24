import { createRoot, type Root } from "react-dom/client";
import YerevanDashboardHeaderMount from "@/components/dashboard/YerevanDashboardHeaderMount";

const roots = new WeakMap<Element, Root>();

function ensurePlayfairCss() {
  if (typeof document === "undefined") return;
  if (document.getElementById("dimad-playfair-css")) return;
  const style = document.createElement("style");
  style.id = "dimad-playfair-css";
  style.textContent = `
    @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&display=swap");
    .font-playfair-embed,
    .font-playfair-embed-var {
      --font-playfair: "Playfair Display";
      font-family: var(--font-playfair), Georgia, serif;
    }
  `;
  document.head.appendChild(style);
}

export function mount(el: HTMLElement): void {
  if (!el) return;
  ensurePlayfairCss();
  let root = roots.get(el);
  if (!root) {
    root = createRoot(el);
    roots.set(el, root);
  }
  root.render(<YerevanDashboardHeaderMount />);
}

export function unmount(el: HTMLElement): void {
  const root = roots.get(el);
  if (!root) return;
  root.unmount();
  roots.delete(el);
}

declare global {
  interface Window {
    __DIMAD_MOUNT_YEREVAN_HEADER?: typeof mount;
    __DIMAD_UNMOUNT_YEREVAN_HEADER?: typeof unmount;
  }
}

if (typeof window !== "undefined") {
  window.__DIMAD_MOUNT_YEREVAN_HEADER = mount;
  window.__DIMAD_UNMOUNT_YEREVAN_HEADER = unmount;
}
