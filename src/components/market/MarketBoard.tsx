"use client";

import { useState } from "react";
import AddToListMenu from "@/components/market/AddToListMenu";
import MarketTickerWidget, { useMarketLists } from "@/components/market/MarketTickerWidget";
import StockChartWidget from "@/components/market/StockChartWidget";
import SymbolSearchBar from "@/components/market/SymbolSearchBar";
import { bareSymbol, toTradingView } from "@/lib/market/lists";

type Props = {
  /** When true, fill the shell mount root instead of forcing 100vh. */
  embedded?: boolean;
};

export default function MarketBoard({ embedded = false }: Props) {
  const [selectedSymbol, setSelectedSymbol] = useState("NASDAQ:AAPL");
  const { lists, activeListId, setActiveListId, persist, addSymbol } = useMarketLists();

  function selectSymbol(symbol: string) {
    setSelectedSymbol(toTradingView(symbol));
  }

  return (
    <main className="market-board" data-embedded={embedded ? "1" : "0"}>
      <style>{`
        nextjs-portal { display: none !important; }
        .market-board {
          height: ${embedded ? "100%" : "100vh"};
          min-height: ${embedded ? "100%" : "100vh"};
          box-sizing: border-box;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          gap: 12px;
          padding: 12px;
          background: #070A0F;
          color: #f8fafc;
        }
        .market-top {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .market-body {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(460px, 520px);
          gap: 12px;
          min-height: 0;
        }
        .market-chart {
          min-height: 0;
          height: 100%;
          border: 1px solid #1E293B;
          border-radius: 12px;
          overflow: hidden;
          background: #070A0F;
        }
        @media (max-width: 1100px) {
          .market-body {
            grid-template-columns: 1fr;
          }
          .market-chart { height: 62vh; min-height: 480px; }
          .market-board[data-embedded="0"] { height: auto; min-height: 100vh; }
        }
      `}</style>

      <div className="market-top">
        <SymbolSearchBar lists={lists} onSelect={selectSymbol} onAdd={addSymbol} />
      </div>

      <div className="market-body">
        <section className="market-chart" aria-label="Price chart">
          <StockChartWidget
            symbol={selectedSymbol}
            toolbar={
              <>
                <span style={{ fontSize: 11, color: "#94a3b8", marginRight: "auto" }}>{bareSymbol(selectedSymbol)}</span>
                <AddToListMenu lists={lists} symbol={bareSymbol(selectedSymbol)} onAdd={addSymbol} />
              </>
            }
          />
        </section>
        <MarketTickerWidget
          selectedSymbol={selectedSymbol}
          onSelect={setSelectedSymbol}
          lists={lists}
          activeListId={activeListId}
          onListsChange={persist}
          onActiveListChange={setActiveListId}
        />
      </div>
    </main>
  );
}
