"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { authFetch, waitForFirebaseToken } from "@/lib/dimad-auth-client";
import {
  finishPlaidConnect,
  isLocalHost,
  plaidAppOrigin,
  writePlaidBearer,
  writePlaidLinkToken
} from "@/lib/plaid-client";

export default function PlaidConnectPage() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState("Preparing secure bank connection…");
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = String(params.get("link_token") || "").trim();
      const idToken = String(params.get("id_token") || "").trim();

      if (idToken) {
        writePlaidBearer(idToken);
      }

      if (fromQuery || idToken) {
        const cleaned = new URL(window.location.href);
        cleaned.searchParams.delete("id_token");
        if (fromQuery) cleaned.searchParams.set("link_token", fromQuery);
        window.history.replaceState({}, "", cleaned.pathname + cleaned.search);
      }

      if (fromQuery) {
        writePlaidLinkToken(fromQuery);
        if (!cancelled) {
          setLinkToken(fromQuery);
          setStatus("Opening secure bank connection…");
        }
        return;
      }

      // Production OAuth redirect_uri is on the allowlisted HTTPS origin.
      if (isLocalHost(window.location.hostname)) {
        const existing = String(
          (() => {
            try {
              return localStorage.getItem("dimad_plaid_link_token") || "";
            } catch {
              return "";
            }
          })()
        );
        const bearer = idToken || (await waitForFirebaseToken(8000));
        if (existing && bearer) {
          const dest = `${plaidAppOrigin()}/integrations/plaid-connect?link_token=${encodeURIComponent(existing)}&id_token=${encodeURIComponent(bearer)}`;
          window.location.replace(dest);
          return;
        }
      }

      try {
        const existing = localStorage.getItem("dimad_plaid_link_token");
        if (existing) {
          if (isLocalHost(window.location.hostname)) {
            const bearer = idToken || (await waitForFirebaseToken(8000));
            if (bearer) {
              window.location.replace(
                `${plaidAppOrigin()}/integrations/plaid-connect?link_token=${encodeURIComponent(existing)}&id_token=${encodeURIComponent(bearer)}`
              );
              return;
            }
          }
          if (!cancelled) {
            setLinkToken(existing);
            setStatus("Opening secure bank connection…");
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
        writePlaidBearer(token);
        const next = String(data.link_token || "");
        if (!res.ok || !next) {
          if (!cancelled) setError(String(data.error || "Could not start Plaid Link."));
          return;
        }
        writePlaidLinkToken(next);
        if (isLocalHost(window.location.hostname)) {
          window.location.replace(
            `${plaidAppOrigin()}/integrations/plaid-connect?link_token=${encodeURIComponent(next)}&id_token=${encodeURIComponent(token)}`
          );
          return;
        }
        if (!cancelled) {
          setLinkToken(next);
          setStatus("Opening secure bank connection…");
        }
      } catch {
        if (!cancelled) setError("Could not start Plaid Link.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        finishPlaidConnect(true);
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
      finishPlaidConnect(false, "denied");
    }
  });

  useEffect(() => {
    if (!linkToken || !ready || opened) return;
    setOpened(true);
    setStatus("Select your bank…");
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
      <div style={{ maxWidth: 460, textAlign: "center" }}>
        <p style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 10, color: "#94a3b8" }}>Plaid</p>
        <h1 style={{ fontSize: 16, margin: "8px 0" }}>{error ? "Connection interrupted" : status}</h1>
        {error ? <p style={{ color: "#fca5a5", fontSize: 12, lineHeight: 1.5 }}>{error}</p> : null}
        {!error ? (
          <p style={{ color: "#64748b", fontSize: 11, lineHeight: 1.55, marginBottom: 16 }}>
            Connect your bank securely through Plaid. Keep this window open until you return to DIMAD.
          </p>
        ) : null}
        {error ? (
          <a href="/dashboard/index.html" style={{ color: "#F59E0B", fontSize: 12 }}>
            Return to dashboard →
          </a>
        ) : (
          <button
            type="button"
            disabled={!ready || !linkToken}
            onClick={() => {
              if (!ready || !linkToken) return;
              setStatus("Select your bank…");
              open();
            }}
            style={{
              background: "#0EA5E9",
              color: "#070A0F",
              border: 0,
              borderRadius: 10,
              padding: "12px 18px",
              fontWeight: 700,
              fontSize: 13,
              cursor: !ready || !linkToken ? "default" : "pointer",
              opacity: !ready || !linkToken ? 0.55 : 1
            }}
          >
            {!linkToken || !ready ? "Preparing…" : "Continue to bank login"}
          </button>
        )}
      </div>
    </main>
  );
}
