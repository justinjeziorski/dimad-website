"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlatformSyncContext } from "@/components/shared/PlatformSyncProvider";

function BootInner() {
  const router = useRouter();
  const sync = usePlatformSyncContext();

  useEffect(() => {
    try {
      router.prefetch("/dashboard");
      router.prefetch("/dashboard/revenue");
    } catch {
      /* ignore */
    }
  }, [router]);

  return (
    <main
      style={{
        margin: 0,
        padding: 8,
        background: "#070A0F",
        color: "#64748b",
        fontFamily: "monospace",
        fontSize: 10
      }}
    >
      Platform sync {sync?.status || "idle"} · {Math.round((sync?.progress || 0) * 100)}%
      <div style={{ marginTop: 4, color: "#8BA0B8" }}>{sync?.detail}</div>
    </main>
  );
}

/** Hidden iframe target from Command Center welcome gate — starts platform sync immediately. */
export default function WorkspaceBootPage() {
  return <BootInner />;
}
