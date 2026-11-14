"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  hint?: string;
  monogram?: string;
  tone?: "stripe" | "shopify";
  onLogout: () => void;
  logoutLabel?: string;
};

export default function AccountBadge({
  label,
  hint = "Account",
  monogram,
  tone = "shopify",
  onLogout,
  logoutLabel = "Log out"
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = (monogram || label.replace(/[^A-Za-z0-9]/g, "").charAt(0) || "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className={`dimad-int-account ${tone}`} ref={rootRef}>
      <button
        type="button"
        className="dimad-int-account-badge"
        aria-expanded={open}
        title={`${label} connected`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="dimad-int-account-avatar" aria-hidden>
          {initial}
        </span>
        <span className="dimad-int-account-copy">
          <span className="k">{hint}</span>
          <span className="v">{label}</span>
        </span>
      </button>
      {open ? (
        <div className="dimad-int-account-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            {logoutLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
