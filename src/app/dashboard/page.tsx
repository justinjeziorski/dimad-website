"use client";

import { useEffect, useRef, useState } from "react";

export default function DashboardPage() {
  const [status, setStatus] = useState("Opening DIMAD OS…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const calendly = params.get("calendly");
    if (calendly === "success") {
      sessionStorage.setItem("calendly_connected", "1");
      setStatus("Calendly connected. Loading workspace…");
    } else if (calendly === "error") {
      setStatus("Calendly did not finish. Loading workspace…");
    }

    const q = params.toString();
    const target = `/dashboard/index.html${q ? `?${q}` : ""}`;
    window.location.replace(target);
  }, []);

  return (
    <main className="min-h-screen bg-[#070A0F] text-slate-200 font-mono p-6 text-sm">
      {status}
    </main>
  );
}
