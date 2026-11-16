"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { authFetch } from "@/lib/dimad-auth-client";

const LINK_TOKEN_KEY = "dimad_plaid_link_token";

function productionOrigin() {
  return String(process.env.NEXT_PUBLIC_PLAID_APP_ORIGIN || "https://dimad.co").replace(/\/$/, "");
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export default function PlaidConnectPage() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState("Preparing secure bank connection…");
  const [error, setError] = useState("");
  const [readyToOpen, setReadyToOpen] = useState(false);

  const queryToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("link_token") || "";
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromQuery = queryToken;
      if (fromQuery) {
        try {
          localStorage.setItem(LINK_TOKEN_KEY, fromQuery);
        } catch {
          /* ignore */
        }
        if (!cancelled) {
          setLinkToken(fromQuery);
          setStatus("Ready — continue in a supported browser to link Chase.");
          setReadyToOpen(true);
        }
        return;
      }

      // Production Chase OAuth requires the allowlisted HTTPS origin (not localhost).
      if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
        const dest = productionOrigin();
        try {
          const existing = localStorage.getItem(LINK_TOKEN_KEY) || "";
          if (existing) {
            window.location.replace(`${dest}/integrations/plaid-connect?link_token=${encodeURIComponent(existing)}`);
            return;
          }
        } catch {
          /* fall through and create token */
        }
      }

      try {
        const existing = localStorage.getItem(LINK_TOKEN_KEY);
        if (existing) {
          if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
            window.location.replace(
              `${productionOrigin()}/integrations/plaid-connect?link_token=${encodeURIComponent(existing)}`
            );
            return;
          }
          if (!cancelled) {
            setLinkToken(existing);
            setStatus("Ready to open Plaid Link.");
            setReadyToOpen(true);
          }
          return;
        }
      } catch {
        /* ignore */
      }

      try {
        const { res, data, token } = await authFetch("/api/plaid/create-link-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        });
        if (!token || res.status === 401) {
          if (!cancelled) setError("Sign in to DIMAD, then connect a bank account.");
          return;
        }
        const next = String(data.link_token || "");
        if (!res.ok || !next) {
          if (!cancelled) setError(String(data.error || "Could not start Plaid Link."));
          return;
        }
        try {
          localStorage.setItem(LINK_TOKEN_KEY, next);
        } catch {
          /* ignore */
        }
        if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
          window.location.replace(
            `${productionOrigin()}/integrations/plaid-connect?link_token=${encodeURIComponent(next)}`
          );
          return;
        }
        if (!cancelled) {
          setLinkToken(next);
          setStatus("Ready to open Plaid Link.");
          setReadyToOpen(true);
        }
      } catch {
        if (!cancelled) setError("Could not start Plaid Link.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryToken]);

  const onSuccess = useCallback(
    async (publicToken: string | null, metadata: { institution?: { name?: string } | null }) => {
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
    },
    []
  );

  const { open, ready } = usePlaidLink({
    token: linkToken || "",
    onSuccess: (publicToken, metadata) => {
      void onSuccess(publicToken, metadata);
    },
    onExit: () => {
      window.location.assign("/dashboard/index.html?connected=plaid&oauth=error&reason=denied");
    },
    onEvent: (eventName, metadata) => {
      if (eventName === "ERROR" || eventName === "EXIT") {
        const code = String((metadata as { error_code?: string })?.error_code || "");
        if (code.toLowerCase().includes("institution") || code.toLowerCase().includes("oauth")) {
          setError(
            "Chase blocked this browser. Finish linking in Chrome, Edge, or Firefox (not an embedded preview)."
          );
        }
      }
    }
  });

  function continueLink() {
    if (!ready || !linkToken) return;
    setStatus("Select your bank…");
    open();
  }

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
      <div style={{ maxWidth: 460, textAlign: "center" }}>
        <p style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 10, color: "#94a3b8" }}>Plaid</p>
        <h1 style={{ fontSize: 16, margin: "8px 0" }}>{error ? "Connection interrupted" : status}</h1>
        {error ? <p style={{ color: "#fca5a5", fontSize: 12, lineHeight: 1.5 }}>{error}</p> : null}
        {!error ? (
          <p style={{ color: "#64748b", fontSize: 11, lineHeight: 1.55, marginBottom: 16 }}>
            Chase requires a supported browser (Chrome, Edge, or Firefox). If you land on Chase “System Requirements”,
            close that tab and continue here from a normal browser window — not an embedded preview.
          </p>
        ) : null}
        {error ? (
          <a href="/dashboard/index.html" style={{ color: "#F59E0B", fontSize: 12 }}>
            Return to dashboard →
          </a>
        ) : (
          <button
            type="button"
            disabled={!readyToOpen || !ready || !linkToken}
            onClick={continueLink}
            style={{
              background: "#0EA5E9",
              color: "#070A0F",
              border: 0,
              borderRadius: 10,
              padding: "12px 18px",
              fontWeight: 700,
              fontSize: 13,
              cursor: !readyToOpen || !ready || !linkToken ? "default" : "pointer",
              opacity: !readyToOpen || !ready || !linkToken ? 0.55 : 1
            }}
          >
            {!linkToken || !ready ? "Preparing…" : "Continue to bank login"}
          </button>
        )}
      </div>
    </main>
  );
}
