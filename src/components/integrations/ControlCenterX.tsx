"use client";

import { useEffect, useRef, useState } from "react";
import AccountBadge from "@/components/integrations/AccountBadge";
import IntegrationLoadingBar from "@/components/integrations/IntegrationLoadingBar";
import { takeWorkspaceHydration } from "@/components/workspace/WorkspaceDataProvider";
import { authFetch } from "@/lib/auth/client";
import { INTEGRATION_CARD_CSS } from "@/components/integrations/integration-card.css";
import { startXOauth } from "@/lib/auth/oauth-client";
import { cacheWorkspaceResponse } from "@/hooks/useWorkspaceHydration";
import type { XProfilePayload } from "@/lib/integrations/x/types";

type XData = XProfilePayload & { ok?: boolean; connected?: boolean; error?: string };
type Flash = { tone: "ok" | "bad"; text: string };

const FLASH_MS = 2 * 60 * 1000;

const REASONS: Record<string, string> = {
  denied: "X connection was cancelled.",
  csrf: "X connection was blocked by a security check. Try again.",
  missing_code: "X did not return an authorization code.",
  token_exchange_failed: "X could not finish connecting the account.",
  token_refresh_failed: "X session expired. Reconnect the account.",
  missing_refresh_token: "X did not return a refresh token. Reconnect with consent.",
  invalid_x_credentials: "X rejected the saved access token. Reconnect.",
  x_request_failed: "Could not reach X.",
  firestore_write_failed: "X connected, but saving the account failed.",
  firestore_permission_denied: "Saving the X account was denied. Deploy the integrations rule.",
  missing_client_id: "X OAuth is not configured on this server.",
  missing_client_secret: "X OAuth secret is not configured on this server.",
  login_required: "Sign in, then connect X."
};

function explain(code: string | undefined, fallback = "Could not load X.") {
  if (!code) return fallback;
  if (REASONS[code]) return REASONS[code];
  if (code.includes(" ") && code.length < 180) return code;
  return fallback;
}

function readFlash(): Flash | null {
  try {
    const raw = sessionStorage.getItem("dimad_x_flash");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { status?: string; reason?: string; at?: number };
    if (!parsed.at || Date.now() - parsed.at > FLASH_MS) return null;
    if (parsed.status === "connected") {
      return { tone: "ok", text: "X account connected. Reach metrics below are live." };
    }
    return { tone: "bad", text: REASONS[parsed.reason || ""] || "X connection failed." };
  } catch {
    return null;
  }
}

function postToDashboard(payload: Record<string, unknown>) {
  if (window.parent === window) return;
  window.parent.postMessage(payload, window.location.origin);
}

function formatEngagement(n: number) {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(n));
}

export default function ControlCenterX() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [profileData, setProfileData] = useState<XData | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<Flash | null>(null);

  function applyPayload(data: Record<string, unknown>, fromCache = false) {
    setSignedOut(false);
    if (!data.connected) {
      setProfileData(null);
      postToDashboard({ type: "dimad-x-status", connected: false });
      if (data.error && !fromCache) setError(explain(String(data.error)));
      return;
    }
    if (data.error && !fromCache) setError(explain(String(data.error)));
    const payload = data as XData;
    setProfileData(payload);
    postToDashboard({
      type: "dimad-x-status",
      connected: true,
      username: payload.username,
      followersCount: payload.followersCount,
      tweetCount: payload.tweetCount
    });
  }

  async function loadData(force = false) {
    setError("");
    if (!force) {
      const cached = takeWorkspaceHydration("x");
      if (cached) {
        applyPayload(cached, true);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      let last: { res: Response; data: Record<string, unknown>; token: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        last = await authFetch("/api/x/data");
        if (last.token && last.res.status !== 401) break;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 900));
      }
      const { res, data, token } = last || { res: new Response(null, { status: 401 }), data: {}, token: "" };
      if (!token || res.status === 401) {
        setSignedOut(true);
        setProfileData(null);
        postToDashboard({ type: "dimad-x-status", connected: false });
        setError("Sign in to DIMAD, then connect X.");
        return;
      }
      cacheWorkspaceResponse("x", data as Record<string, unknown>, res.ok, res.status);
      applyPayload(data as Record<string, unknown>);
    } catch {
      setError("Failed to fetch from X.");
    } finally {
      setLoading(false);
    }
  }

  async function startConnect() {
    setConnecting(true);
    setError("");
    try {
      const result = await startXOauth();
      if (!result.ok) {
        if (result.error === "login_required") {
          (window.top || window).location.assign("/login.html");
          return;
        }
        setError(explain(result.error, "Could not start X OAuth."));
        setConnecting(false);
      }
    } catch {
      setError("Could not start X OAuth.");
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Log out of this X account?")) return;
    setLoading(true);
    setError("");
    try {
      const { res, data } = await authFetch("/api/x/data", { method: "DELETE" });
      if (!res.ok || data.ok === false) {
        setError(explain(String(data.error || ""), "Could not disconnect X."));
        setLoading(false);
        return;
      }
      setProfileData(null);
      postToDashboard({ type: "dimad-x-status", connected: false });
    } catch {
      setError("Could not disconnect X.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setFlash(readFlash());
    void loadData();
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "dimad-x-connect") void startConnect();
      if (event.data?.type === "dimad-x-refresh") void loadData(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.parent === window) return;
    const post = () => {
      postToDashboard({ type: "dimad-x-resize", height: Math.ceil(node.getBoundingClientRect().height) });
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, profileData, error, flash, connecting, signedOut]);

  const connected = Boolean(profileData?.userId || profileData?.username);
  const latest = profileData?.recentTweets?.[0];

  return (
    <section ref={rootRef} className="dimad-int-card">
      <style>{INTEGRATION_CARD_CSS}</style>

      {flash ? <div className={`dimad-int-banner ${flash.tone}`} role="status">{flash.text}</div> : null}
      {error ? <div className="dimad-int-banner bad" role="alert">{error}</div> : null}

      <div className="dimad-int-head">
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          {connected && profileData?.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileData.profileImageUrl}
              alt=""
              width={34}
              height={34}
              style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover", border: "1px solid #1E293B", flex: "none" }}
            />
          ) : (
            <div className="dimad-int-brand x" aria-hidden>
              𝕏
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p className="dimad-int-kicker">X</p>
            <h2>{connected ? `@${profileData!.username}` : "Social reach"}</h2>
            {connected ? (
              <p className="dimad-int-meta">{profileData!.name || "Connected account"}</p>
            ) : (
              <p className="dimad-int-meta">Reach and impression tracking</p>
            )}
          </div>
        </div>
        {connected ? (
          <div className="dimad-int-actions">
            <span className="dimad-int-badge">Connected</span>
            <AccountBadge
              tone="shopify"
              label={`@${profileData!.username}`}
              hint="Viewing"
              monogram="X"
              onLogout={() => void disconnect()}
              logoutLabel="Log out X"
            />
            <button type="button" className="dimad-int-ghost" disabled={loading} onClick={() => void loadData(true)}>
              Refresh
            </button>
          </div>
        ) : null}
      </div>

      {loading && !connected ? <IntegrationLoadingBar tone="stripe" /> : null}

      {!loading && !connected ? (
        <>
          <p className="dimad-int-note">
            {signedOut
              ? "Sign in to DIMAD, then connect X."
              : "Connect with read-only X access to track social reach and impressions. DIMAD never posts on your behalf."}
          </p>
          <button type="button" className="dimad-int-primary x" disabled={connecting} onClick={() => void startConnect()}>
            {connecting ? "Connecting…" : "Connect X"}
          </button>
        </>
      ) : null}

      {connected && profileData ? (
        <>
          <div className="dimad-int-metrics">
            <div className="dimad-int-metric">
              <div className="k">Followers</div>
              <div className="v">{profileData.followersDisplay}</div>
              <div className="s">Audience</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Following</div>
              <div className="v">{profileData.followingDisplay}</div>
              <div className="s">Accounts</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Posts</div>
              <div className="v">{profileData.tweetDisplay}</div>
              <div className="s">Lifetime</div>
            </div>
          </div>

          <div className="dimad-int-col" style={{ marginTop: 12 }}>
            <h3>Recent engagement</h3>
            {latest ? (
              <>
                <p className="dimad-int-note" style={{ marginTop: 4 }}>
                  {latest.text.length > 140 ? `${latest.text.slice(0, 140)}…` : latest.text}
                </p>
                <div className="dimad-int-metrics" style={{ marginTop: 8 }}>
                  <div className="dimad-int-metric">
                    <div className="k">Likes</div>
                    <div className="v">{formatEngagement(latest.likeCount)}</div>
                  </div>
                  <div className="dimad-int-metric">
                    <div className="k">Reposts</div>
                    <div className="v">{formatEngagement(latest.retweetCount)}</div>
                  </div>
                  <div className="dimad-int-metric">
                    <div className="k">Replies</div>
                    <div className="v">{formatEngagement(latest.replyCount)}</div>
                  </div>
                  <div className="dimad-int-metric">
                    <div className="k">Impressions</div>
                    <div className="v">{formatEngagement(latest.impressionCount)}</div>
                  </div>
                </div>
              </>
            ) : (
              <p className="dimad-int-empty">No recent posts synced yet.</p>
            )}
          </div>

          <div className="dimad-int-foot">
            <span className="dimad-int-meta" style={{ margin: 0 }}>
              Synced via X API v2
            </span>
            <button type="button" className="dimad-int-link" onClick={() => void disconnect()}>
              Disconnect
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
