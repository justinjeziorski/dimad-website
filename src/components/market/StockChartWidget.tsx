"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

const EMBED_SRC = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

type StockChartWidgetProps = {
  symbol?: string;
  toolbar?: ReactNode;
};

export default function StockChartWidget({ symbol = "NASDAQ:AAPL", toolbar }: StockChartWidgetProps) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return;

    node.replaceChildren();

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";

    const script = document.createElement("script");
    script.src = EMBED_SRC;
    script.async = true;
    script.type = "text/javascript";
    script.text = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "#070A0F",
      gridColor: "rgba(30, 41, 59, 0.55)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com"
    });

    node.append(widget, script);

    return () => {
      node.replaceChildren();
    };
  }, [symbol]);

  return (
    <div style={shell}>
      {toolbar ? <div style={toolbarRow}>{toolbar}</div> : null}
      <div style={chartFrame}>
        <div ref={host} className="tradingview-widget-container" style={{ flex: 1, minHeight: 0, width: "100%", height: "100%" }} />
        {/* Covers the TradingView corner badge inside the cross-origin iframe. Attribution remains via the link below. */}
        <div aria-hidden style={logoCover} />
      </div>
      <a
        href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`}
        target="_blank"
        rel="noreferrer"
        style={credit}
      >
        Chart by TradingView
      </a>
    </div>
  );
}

const shell: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 520,
  background: "#070A0F"
};

const toolbarRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  padding: "8px 10px",
  borderBottom: "1px solid #1E293B",
  background: "#0B0F17"
};

const chartFrame: CSSProperties = {
  position: "relative",
  flex: 1,
  minHeight: 0,
  width: "100%",
  overflow: "hidden"
};

const logoCover: CSSProperties = {
  position: "absolute",
  left: 0,
  bottom: 0,
  width: 80,
  height: 52,
  background: "#070A0F",
  pointerEvents: "none",
  zIndex: 20
};

const credit: CSSProperties = {
  fontSize: 10,
  color: "#64748b",
  textAlign: "right",
  padding: "4px 8px",
  textDecoration: "none"
};
