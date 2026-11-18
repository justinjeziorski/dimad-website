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
          background: #0A192F;
          color-scheme: dark;
          overflow: hidden !important;
          height: auto !important;
          min-height: 0 !important;
        }
        #__next, body > div:not(#finances-workspace-root) {
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
        }
      `}</style>
      <div
        id="finances-workspace-root"
        className="w-full bg-[#0A192F] text-white relative overflow-x-hidden"
        style={{ minHeight: 0 }}
      >
        {children}
      </div>
    </>
  );
}
