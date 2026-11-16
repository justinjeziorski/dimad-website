"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  preloadAllWorkspaceData,
  WorkspaceDataProvider
} from "@/components/workspace/WorkspaceDataProvider";

function BootInner() {
  const router = useRouter();

  useEffect(() => {
    try {
      router.prefetch("/dashboard");
    } catch {
      /* ignore */
    }
    void preloadAllWorkspaceData();
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
      Workspace preload
    </main>
  );
}

export default function WorkspaceBootPage() {
  return (
    <WorkspaceDataProvider>
      <BootInner />
    </WorkspaceDataProvider>
  );
}
