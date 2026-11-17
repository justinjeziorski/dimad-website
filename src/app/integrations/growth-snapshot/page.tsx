import GrowthSnapshotCard from "@/components/snapshots/GrowthSnapshotCard";

export const dynamic = "force-dynamic";

export default function GrowthSnapshotPage() {
  return (
    <>
      <style>{`html,body{margin:0;height:100%;overflow:hidden;background:#0A192F;color-scheme:dark}#__next,body>div{height:100%}`}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" />
      <GrowthSnapshotCard />
    </>
  );
}
