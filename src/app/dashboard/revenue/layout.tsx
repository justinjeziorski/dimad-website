"use client";

import { useEffect, type ReactNode } from "react";
import { perfMark } from "@/lib/perf/timing";

export default function RevenueLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    perfMark("client.revenue.layout.mount");
    if (typeof window === "undefined" || window.parent === window) return;

    let last = 0;
    const publish = () => {
      const root = document.getElementById("revenue-workspace-root");
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
    const root = document.getElementById("revenue-workspace-root");
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
        #__next, body > div:not(#revenue-workspace-root) {
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
        }
        #revenue-workspace-root {
          background: var(--bg-canvas, #060911);
          color: var(--text-primary, #f1f5f9);
        }
        html[data-theme="light"] #revenue-workspace-root {
          background: var(--bg-nav, #e8ecf2);
          color: var(--text-primary, #000000);
        }
      `}</style>
      <div
        id="revenue-workspace-root"
        className="w-full relative overflow-x-hidden"
        style={{ minHeight: 0 }}
        suppressHydrationWarning
      >
        {children}
      </div>
    </>
  );
}
