import StripeConnectCard from "@/components/integrations/StripeConnectCard";

export const dynamic = "force-dynamic";

export default function StripeConnectCardPage() {
  return (
    <>
      <style>{`html,body{margin:0;background:#09090b;color-scheme:dark}`}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" />
      <StripeConnectCard />
    </>
  );
}
