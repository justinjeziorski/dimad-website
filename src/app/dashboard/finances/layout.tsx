"use client";

import { useEffect, type ReactNode } from "react";
import { perfMark } from "@/lib/perf/timing";

export default function FinancesLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    perfMark("client.finances.layout.mount");
    if (typeof window === "undefined" || window.parent === window) return;

    let last = 0;
    const publish = () => {
      const root = document.getElementById("finances-workspace-root");
      if (!root) return;
      const height = Math.ceil(root.getBoundingClientRect().height);
      if (!height || Math.abs(height - last) < 4) return;
      last = height;
      window.parent.postMessage(
        { type: "dimad-revenue-workspace-resize", height },
        window.location.origin
      );
    };

    publish();
    const root = document.getElementById("finances-workspace-root");
    if (!root) return;
    const observer = new ResizeObserver(() => publish());
    observer.observe(root);
    window.addEventListener("load", publish);
    return () => {
      observer.disconnect();
      window.removeEventListener("load", publish);
    };
  }, []);

  return (
    <>
      <style>{`
        html, body {
          margin: 0;
          background: var(--bg-canvas, #060911);
          color: var(--text-primary, #f1f5f9);
          overflow: hidden !important;
          height: auto !important;
          min-height: 0 !important;
        }
        html[data-theme="light"], html[data-theme="light"] body {
          background: var(--bg-nav, #e8ecf2);
          color: var(--text-primary, #000000);
          color-scheme: light;
        }
        #__next, body > div:not(#finances-workspace-root) {
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
        }
        #finances-workspace-root {
          background: var(--bg-canvas, #060911);
          color: var(--text-primary, #f1f5f9);
        }
        html[data-theme="light"] #finances-workspace-root {
          background: var(--bg-nav, #e8ecf2);
          color: var(--text-primary, #000000);
        }
      `}</style>
      <div
        id="finances-workspace-root"
        className="w-full relative overflow-x-hidden"
        style={{ minHeight: 0 }}
        suppressHydrationWarning
      >
        {children}
      </div>
    </>
  );
}
