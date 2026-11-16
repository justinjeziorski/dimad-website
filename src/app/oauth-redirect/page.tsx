"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { authFetch } from "@/lib/dimad-auth-client";

const LINK_TOKEN_KEY = "dimad_plaid_link_token";

export default function PlaidOAuthRedirectPage() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState("Resuming bank connection…");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setLinkToken(localStorage.getItem(LINK_TOKEN_KEY));
    } catch {
      setLinkToken(null);
    }
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
      try {
        localStorage.removeItem(LINK_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      window.location.assign("/dashboard/index.html?connected=plaid");
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
      window.location.assign("/dashboard/index.html?connected=plaid&oauth=error&reason=denied");
    }
  });

  useEffect(() => {
    if (!linkToken) {
      setError("Missing Plaid link session. Return to Command Center and connect again.");
      return;
    }
    if (ready) open();
  }, [linkToken, ready, open]);

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
        ) : null}
      </div>
    </main>
  );
}
