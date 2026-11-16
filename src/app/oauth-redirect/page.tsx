"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { authFetch } from "@/lib/dimad-auth-client";
import {
  finishPlaidConnect,
  readPlaidLinkToken,
  writePlaidBearer
} from "@/lib/plaid-client";

export default function PlaidOAuthRedirectPage() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState("Resuming bank connection…");
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idToken = String(params.get("id_token") || "").trim();
    if (idToken) {
      writePlaidBearer(idToken);
      const cleaned = new URL(window.location.href);
      cleaned.searchParams.delete("id_token");
      window.history.replaceState({}, "", cleaned.pathname + cleaned.search + cleaned.hash);
    }
    setLinkToken(readPlaidLinkToken() || null);
  }, []);

  const receivedRedirectUri = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return window.location.href;
  }, []);

  const onSuccess = useCallback(async (publicToken: string | null, metadata: { institution?: { name?: string } | null }) => {
    if (!publicToken) {
      setError("Plaid did not return a public token.");
      return;
    }
    setStatus("Saving bank connection…");
    try {
      const { res, data } = await authFetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token: publicToken, metadata })
      });
      if (!res.ok || data.success === false || data.ok === false) {
        setError(String(data.error || "Could not finish linking the bank account."));
        return;
      }
      finishPlaidConnect(true);
    } catch {
      setError("Could not finish linking the bank account.");
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken || "",
    receivedRedirectUri,
    onSuccess: (publicToken, metadata) => {
      void onSuccess(publicToken, metadata);
    },
    onExit: () => {
      finishPlaidConnect(false, "denied");
    }
  });

  useEffect(() => {
    if (!linkToken) {
      setError("Missing Plaid link session. Return to Command Center and connect again.");
      return;
    }
    if (!ready || opened) return;
    setOpened(true);
    open();
  }, [linkToken, ready, open, opened]);

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        display: "grid",
        placeItems: "center",
        background: "#070A0F",
        color: "#e2e8f0",
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        padding: 24
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <p style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 10, color: "#94a3b8" }}>Plaid</p>
        <h1 style={{ fontSize: 16, margin: "8px 0" }}>{error ? "Connection interrupted" : status}</h1>
        {error ? <p style={{ color: "#fca5a5", fontSize: 12, lineHeight: 1.5 }}>{error}</p> : null}
        {error ? (
          <a href="/dashboard/index.html" style={{ color: "#F59E0B", fontSize: 12 }}>
            Return to dashboard →
          </a>
        ) : (
          <p style={{ color: "#64748b", fontSize: 11, lineHeight: 1.5 }}>
            Finishing your bank connection and returning you to DIMAD…
          </p>
        )}
      </div>
    </main>
  );
}
