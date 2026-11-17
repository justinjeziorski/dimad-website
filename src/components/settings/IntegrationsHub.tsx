"use client";

import { SNAPSHOT_THEME } from "@/lib/snapshot-theme";

const GROUPS = [
  {
    title: "Revenue",
    items: [
      { id: "stripe", label: "Stripe", href: "/dashboard/index.html", hint: "Payments & MRR" },
      { id: "shopify", label: "Shopify", href: "/dashboard/index.html", hint: "Storefront sales" },
      { id: "lemon", label: "Lemon Squeezy", href: "/dashboard/index.html", hint: "Digital products" },
      { id: "gumroad", label: "Gumroad", href: "/dashboard/index.html", hint: "Creator commerce" },
      { id: "patreon", label: "Patreon", href: "/dashboard/index.html", hint: "Memberships" }
    ]
  },
  {
    title: "Growth",
    items: [
      { id: "youtube", label: "YouTube", href: "/dashboard/index.html", hint: "Audience & views" },
      { id: "x", label: "X", href: "/dashboard/index.html", hint: "Followers & reach" },
      { id: "mailerlite", label: "MailerLite", href: "/dashboard/index.html", hint: "List health" }
    ]
  },
  {
    title: "Finance",
    items: [{ id: "plaid", label: "Plaid", href: "/dashboard/index.html", hint: "Expenses & liquidity (excluded from revenue)" }]
  }
];

export default function IntegrationsHub() {
  function goCommandCenter(moduleHint: string) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: "dimad-open-tab", tabId: "ent-dashboard", revealModule: moduleHint },
          window.location.origin
        );
        window.parent.postMessage({ type: "dimad-close-vault" }, window.location.origin);
        return;
      }
    } catch {
      /* ignore */
    }
    window.location.assign("/dashboard/index.html");
  }

  return (
    <div
      style={{
        color: SNAPSHOT_THEME.ink,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace'
      }}
    >
      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: SNAPSHOT_THEME.gold }}>
        Settings & Vault
      </p>
      <h1 style={{ margin: "8px 0 6px", fontSize: 24, fontWeight: 700 }}>Integrations</h1>
      <p style={{ margin: "0 0 22px", color: SNAPSHOT_THEME.mute, fontSize: 12, maxWidth: 560, lineHeight: 1.5 }}>
        Connect commerce and audience platforms. Revenue snapshots never include Plaid bank balances.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {GROUPS.map((group) => (
          <section
            key={group.title}
            style={{
              background: "rgba(17, 34, 64, 0.72)",
              border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
              borderRadius: 16,
              padding: 16
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: SNAPSHOT_THEME.gold
              }}
            >
              {group.title}
            </h2>
            <div style={{ display: "grid", gap: 8 }}>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goCommandCenter(item.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    color: SNAPSHOT_THEME.ink,
                    cursor: "pointer"
                  }}
                >
                  <span>
                    <strong style={{ display: "block", fontSize: 13 }}>{item.label}</strong>
                    <span style={{ color: SNAPSHOT_THEME.mute, fontSize: 11 }}>{item.hint}</span>
                  </span>
                  <span style={{ color: SNAPSHOT_THEME.gold, fontSize: 11, fontWeight: 700 }}>Open →</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
