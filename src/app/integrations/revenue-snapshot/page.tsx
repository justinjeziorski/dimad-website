import RevenueSnapshotCard from "@/components/snapshots/RevenueSnapshotCard";
import { EMBED_PAGE_STYLE } from "@/lib/theme/embedStyles";

export const dynamic = "force-dynamic";

export default function RevenueSnapshotPage() {
  return (
    <>
      <style>{EMBED_PAGE_STYLE}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" />
      <RevenueSnapshotCard />
    </>
  );
}
