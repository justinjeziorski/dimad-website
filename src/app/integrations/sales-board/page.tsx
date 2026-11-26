import SalesRevenueBoard from "@/components/integrations/SalesRevenueBoard";

export const dynamic = "force-dynamic";

export default function SalesRevenueBoardPage() {
  return (
    <>
      <style>{`html,body{margin:0;background:var(--bg-nav,var(--bg-canvas,#070A0F))}html[data-theme="light"],html[data-theme="light"] body{background:var(--bg-nav,#e8ecf2)!important;color-scheme:light}`}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" />
      <SalesRevenueBoard />
    </>
  );
}
