"use client";

import { useEffect, useRef, useState } from "react";
import AccountBadge from "@/components/integrations/AccountBadge";
import IntegrationLoadingBar from "@/components/integrations/IntegrationLoadingBar";
import { authFetch } from "@/lib/auth/client";
import { INTEGRATION_CARD_CSS } from "@/components/integrations/integration-card.css";
import { startYoutubeOAuth } from "@/lib/auth/oauth-client";
import { cacheWorkspaceResponse } from "@/hooks/useWorkspaceHydration";
import { takeWorkspaceHydration } from "@/components/workspace/WorkspaceDataProvider";
import type { YouTubeChannelPayload } from "@/lib/integrations/youtube/types";

type YouTubeData = YouTubeChannelPayload & { ok?: boolean; connected?: boolean; error?: string };
type Flash = { tone: "ok" | "bad"; text: string };

const FLASH_MS = 2 * 60 * 1000;

const REASONS: Record<string, string> = {
  denied: "YouTube connection was cancelled.",
  csrf: "YouTube connection was blocked by a security check. Try again.",
  missing_code: "YouTube did not return an authorization code.",
  token_exchange_failed: "YouTube could not finish connecting the account.",
  token_refresh_failed: "YouTube session expired. Reconnect the channel.",
  missing_refresh_token: "YouTube did not return a refresh token. Reconnect with consent.",
  invalid_youtube_credentials: "YouTube rejected the saved access token. Reconnect.",
  youtube_request_failed: "Could not reach YouTube.",
  youtube_channel_missing: "No YouTube channel was found for this Google account.",
  firestore_write_failed: "YouTube connected, but saving the account failed.",
  firestore_permission_denied: "Saving the YouTube account was denied. Deploy the integrations rule.",
  missing_client_id: "Google OAuth is not configured on this server.",
  missing_client_secret: "Google OAuth secret is not configured on this server.",
  login_required: "Sign in, then connect YouTube."
};

function explain(code: string | undefined, fallback = "Could not load YouTube.") {
  if (!code) return fallback;
  if (REASONS[code]) return REASONS[code];
  if (code.includes(" ") && code.length < 180) return code;
  return fallback;
}

function readFlash(): Flash | null {
  try {
    const raw = sessionStorage.getItem("dimad_youtube_flash");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { status?: string; reason?: string; at?: number };
    if (!parsed.at || Date.now() - parsed.at > FLASH_MS) return null;
    if (parsed.status === "connected") {
      return { tone: "ok", text: "YouTube channel connected. Metrics below are live." };
    }
    return { tone: "bad", text: REASONS[parsed.reason || ""] || "YouTube connection failed." };
  } catch {
    return null;
  }
}

function postToDashboard(payload: Record<string, unknown>) {
  if (window.parent === window) return;
  window.parent.postMessage(payload, window.location.origin);
}

export default function ControlCenterYouTube() {
  const rootRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [channelData, setChannelData] = useState<YouTubeData | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<Flash | null>(null);

  function applyPayload(data: Record<string, unknown>, fromCache = false) {
    setSignedOut(false);
    if (!data.connected) {
      setChannelData(null);
      postToDashboard({ type: "dimad-youtube-status", connected: false });
      if (data.error && !fromCache) setError(explain(String(data.error)));
      return;
    }
    if (data.error && !fromCache) setError(explain(String(data.error)));
    const payload = data as YouTubeData;
    setChannelData(payload);
    postToDashboard({
      type: "dimad-youtube-status",
      connected: true,
      channelTitle: payload.channelTitle,
      subscriberCount: payload.subscriberCount,
      viewCount: payload.viewCount,
      videoCount: payload.videoCount
    });
  }

  async function loadData(force = false) {
    setError("");
    if (!force) {
      const cached = takeWorkspaceHydration("youtube");
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
        last = await authFetch("/api/youtube/data");
        if (last.token && last.res.status !== 401) break;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 900));
      }
      const { res, data, token } = last || { res: new Response(null, { status: 401 }), data: {}, token: "" };
      if (!token || res.status === 401) {
        setSignedOut(true);
        setChannelData(null);
        postToDashboard({ type: "dimad-youtube-status", connected: false });
        setError("Sign in to DIMAD, then connect YouTube.");
        return;
      }
      cacheWorkspaceResponse("youtube", data as Record<string, unknown>, res.ok, res.status);
      applyPayload(data as Record<string, unknown>);
    } catch {
      setError("Failed to fetch from YouTube.");
    } finally {
      setLoading(false);
    }
  }

  async function startConnect() {
    setConnecting(true);
    setError("");
    try {
      const result = await startYoutubeOAuth();
      if (!result.ok) {
        if (result.error === "login_required") {
          (window.top || window).location.assign("/login.html");
          return;
        }
        setError(explain(result.error, "Could not start YouTube OAuth."));
        setConnecting(false);
      }
    } catch {
      setError("Could not start YouTube OAuth.");
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Log out of this YouTube channel?")) return;
    setLoading(true);
    setError("");
    try {
      const { res, data } = await authFetch("/api/youtube/data", { method: "DELETE" });
      if (!res.ok || data.ok === false) {
        setError(explain(String(data.error || ""), "Could not disconnect YouTube."));
        setLoading(false);
        return;
      }
      setChannelData(null);
      postToDashboard({ type: "dimad-youtube-status", connected: false });
    } catch {
      setError("Could not disconnect YouTube.");
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
      if (event.data?.type === "dimad-youtube-connect") void startConnect();
      if (event.data?.type === "dimad-youtube-refresh") void loadData(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.parent === window) return;
    const post = () => {
      postToDashboard({ type: "dimad-youtube-resize", height: Math.ceil(node.getBoundingClientRect().height) });
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, channelData, error, flash, connecting, signedOut]);

  const connected = Boolean(channelData?.channelId || channelData?.channelTitle);
  const latest = channelData?.recentVideos?.[0];

  return (
    <section ref={rootRef} className="dimad-int-card">
      <style>{INTEGRATION_CARD_CSS}</style>

      {flash ? <div className={`dimad-int-banner ${flash.tone}`} role="status">{flash.text}</div> : null}
      {error ? <div className="dimad-int-banner bad" role="alert">{error}</div> : null}

      <div className="dimad-int-head">
        <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
          {connected && channelData?.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channelData.thumbnail}
              alt=""
              width={34}
              height={34}
              style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover", border: "1px solid #1E293B", flex: "none" }}
            />
          ) : (
            <div className="dimad-int-brand youtube" aria-hidden>
              ▶
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p className="dimad-int-kicker">YouTube</p>
            <h2>{connected ? channelData!.channelTitle : "Channel"}</h2>
            {connected ? (
              <p className="dimad-int-meta">Read-only channel performance</p>
            ) : (
              <p className="dimad-int-meta">Performance and traffic tracking</p>
            )}
          </div>
        </div>
        {connected ? (
          <div className="dimad-int-actions">
            <span className="dimad-int-badge">Connected</span>
            <AccountBadge
              tone="shopify"
              label={channelData!.channelTitle || "YouTube"}
              hint="Viewing"
              monogram="Y"
              onLogout={() => void disconnect()}
              logoutLabel="Log out YouTube"
            />
            <button type="button" className="dimad-int-ghost" disabled={loading} onClick={() => void loadData(true)}>
              Refresh
            </button>
          </div>
        ) : null}
      </div>

      {loading && !connected ? <IntegrationLoadingBar tone="amber" /> : null}

      {!loading && !connected ? (
        <>
          <p className="dimad-int-note">
            {signedOut
              ? "Sign in to DIMAD, then connect YouTube."
              : "Connect with read-only YouTube access to track channel performance and traffic. DIMAD never uploads or edits videos."}
          </p>
          <button type="button" className="dimad-int-primary youtube" disabled={connecting} onClick={() => void startConnect()}>
            {connecting ? "Connecting…" : "Connect YouTube"}
          </button>
        </>
      ) : null}

      {connected && channelData ? (
        <>
          <div className="dimad-int-metrics">
            <div className="dimad-int-metric">
              <div className="k">Subscriptions</div>
              <div className="v">{channelData.subscriberDisplay}</div>
              <div className="s">Subscribers</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Total views</div>
              <div className="v">{channelData.viewDisplay}</div>
              <div className="s">Lifetime lifetime</div>
            </div>
            <div className="dimad-int-metric">
              <div className="k">Videos</div>
              <div className="v">{channelData.videoDisplay}</div>
              <div className="s">Published</div>
            </div>
          </div>

          <div className="dimad-int-col" style={{ marginTop: 12 }}>
            <h3>Latest upload</h3>
            {latest ? (
              <div className="dimad-int-row" style={{ alignItems: "center", gap: 10 }}>
                {latest.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={latest.thumbnail}
                    alt=""
                    width={72}
                    height={40}
                    style={{ width: 72, height: 40, borderRadius: 8, objectFit: "cover", border: "1px solid #1E293B", flex: "none" }}
                  />
                ) : null}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span className="title" style={{ display: "block" }}>
                    {latest.title}
                  </span>
                  <span className="meta">
                    {latest.publishedAt ? new Date(latest.publishedAt).toLocaleDateString() : "Recent"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="dimad-int-empty">No recent uploads synced yet.</p>
            )}
          </div>

          <div className="dimad-int-foot">
            <span className="dimad-int-meta" style={{ margin: 0 }}>
              Synced via YouTube Data API v3
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
