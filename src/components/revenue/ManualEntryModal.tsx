"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { authFetch } from "@/lib/dimad-auth-client";
import { useIframeCenteredOverlay } from "@/hooks/useIframeCenteredOverlay";
import {
  addLocalSourceTag,
  DEFAULT_SOURCE_TAGS,
  readLocalSourceTags,
  writeLocalSourceTags
} from "@/lib/revenue/source-tags";
import type { ManualLedgerInput, UnifiedTransaction } from "@/lib/revenue/types";
import { SNAPSHOT_THEME } from "@/lib/snapshot-theme";

const DEFAULT_CATEGORIES = [
  "One-Time Sale",
  "Subscription",
  "Consulting",
  "Affiliate",
  "SaaS Tools",
  "Payroll",
  "Marketing",
  "Operations",
  "Other"
];

const CREATE_VALUE = "__dimad_create_new__";

export default function ManualEntryModal({
  open,
  onClose,
  onSave,
  initial
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: ManualLedgerInput & { id?: string }) => Promise<void>;
  initial?: UnifiedTransaction | null;
}) {
  const overlayStyle = useIframeCenteredOverlay(open);
  const [type, setType] = useState<"REVENUE" | "EXPENSE">("REVENUE");
  const [merchantOrCustomer, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("One-Time Sale");
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [platformLabel, setPlatformLabel] = useState(DEFAULT_SOURCE_TAGS[0] || "Cash / Wire");
  const [tags, setTags] = useState<string[]>(DEFAULT_SOURCE_TAGS);
  const [creatingTag, setCreatingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const newTagRef = useRef<HTMLInputElement>(null);
  const newCategoryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTags(readLocalSourceTags());
    void (async () => {
      try {
        const { data, res } = await authFetch("/api/revenue/source-tags");
        if (res.ok && Array.isArray((data as { tags?: string[] }).tags)) {
          const next = (data as { tags: string[] }).tags;
          writeLocalSourceTags(next);
          setTags(next);
        }
      } catch {
        /* local tags only */
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setType(initial.type);
      setMerchant(initial.merchantOrCustomer || "");
      setAmount(String(initial.amount || ""));
      setDate(initial.date.slice(0, 10));
      setCategory(initial.category || "One-Time Sale");
      setCategories((prev) =>
        initial.category && !prev.includes(initial.category) ? [...prev, initial.category] : prev
      );
      setPlatformLabel(initial.platformLabel || DEFAULT_SOURCE_TAGS[0]!);
      setIsRecurring(Boolean(initial.isRecurring));
      setNotes(initial.notes || "");
      setCreatingCategory(false);
      setCreatingTag(false);
      setNewCategory("");
      setNewTag("");
      return;
    }
    setType("REVENUE");
    setMerchant("");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setCategory("One-Time Sale");
    setPlatformLabel(DEFAULT_SOURCE_TAGS[0] || "Cash / Wire");
    setIsRecurring(false);
    setNotes("");
    setCreatingCategory(false);
    setCreatingTag(false);
    setNewCategory("");
    setNewTag("");
    setError("");
  }, [open, initial]);

  useEffect(() => {
    if (creatingTag) newTagRef.current?.focus();
  }, [creatingTag]);

  useEffect(() => {
    if (creatingCategory) newCategoryRef.current?.focus();
  }, [creatingCategory]);

  if (!open) return null;

  function commitNewTag() {
    const tag = newTag.trim();
    if (!tag) {
      setCreatingTag(false);
      return;
    }
    const next = addLocalSourceTag(tag);
    setTags(next);
    setPlatformLabel(tag);
    setNewTag("");
    setCreatingTag(false);
    void authFetch("/api/revenue/source-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag })
    }).catch(() => undefined);
  }

  function commitNewCategory() {
    const value = newCategory.trim();
    if (!value) {
      setCreatingCategory(false);
      return;
    }
    setCategories((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setCategory(value);
    setNewCategory("");
    setCreatingCategory(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const value = Math.abs(Number(amount));
    if (!merchantOrCustomer.trim() || !value) {
      setError("Title/merchant and amount are required.");
      return;
    }
    if (!platformLabel.trim()) {
      setError("Choose or create a custom source tag.");
      return;
    }
    if (!category.trim()) {
      setError("Choose or create a category.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        type,
        merchantOrCustomer: merchantOrCustomer.trim(),
        amount: value,
        date: new Date(date).toISOString(),
        category: category.trim(),
        platformLabel: platformLabel.trim(),
        isRecurring,
        recurringInterval: isRecurring ? "monthly" : undefined,
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      onClick={onClose}
      style={{
        ...overlayStyle,
        zIndex: 80,
        background: "rgba(4,8,16,0.72)"
      }}
    >
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void submit(event)}
        style={{
          width: "min(440px, 100%)",
          maxHeight: "min(92%, 640px)",
          overflow: "auto",
          background: SNAPSHOT_THEME.navy,
          border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
          borderRadius: 16,
          padding: 18,
          display: "grid",
          gap: 10,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)"
        }}
      >
        <div>
          <p style={kickerStyle}>Manual ledger</p>
          <h3 style={{ margin: "4px 0 0", fontSize: 16 }}>{initial ? "Edit Manual Entry" : "Add Manual Entry"}</h3>
        </div>
        {error ? <p style={{ margin: 0, color: SNAPSHOT_THEME.danger, fontSize: 12 }}>{error}</p> : null}
        <label style={labelStyle}>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as "REVENUE" | "EXPENSE")} style={inputStyle}>
            <option value="REVENUE">Revenue</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </label>
        <label style={labelStyle}>
          Title / Merchant
          <input value={merchantOrCustomer} onChange={(e) => setMerchant(e.target.value)} style={inputStyle} required />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={labelStyle}>
            Amount
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              style={inputStyle}
              required
            />
          </label>
          <label style={labelStyle}>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} required />
          </label>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 11, color: SNAPSHOT_THEME.mute }}>Category</span>
          {creatingCategory ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={newCategoryRef}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitNewCategory();
                  }
                  if (e.key === "Escape") {
                    setCreatingCategory(false);
                    setNewCategory("");
                  }
                }}
                placeholder="New category name"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={commitNewCategory} style={primaryBtn}>
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingCategory(false);
                  setNewCategory("");
                }}
                style={ghostBtn}
              >
                Cancel
              </button>
            </div>
          ) : (
            <select
              value={category}
              onChange={(e) => {
                const value = e.target.value;
                if (value === CREATE_VALUE) {
                  setCreatingCategory(true);
                  setNewCategory("");
                  return;
                }
                setCategory(value);
              }}
              style={inputStyle}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value={CREATE_VALUE}>＋ New category…</option>
            </select>
          )}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 11, color: SNAPSHOT_THEME.mute }}>Custom source tag</span>
          {creatingTag ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={newTagRef}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitNewTag();
                  }
                  if (e.key === "Escape") {
                    setCreatingTag(false);
                    setNewTag("");
                  }
                }}
                placeholder="New source tag"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={commitNewTag} style={primaryBtn}>
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingTag(false);
                  setNewTag("");
                }}
                style={ghostBtn}
              >
                Cancel
              </button>
            </div>
          ) : (
            <select
              value={platformLabel}
              onChange={(e) => {
                const value = e.target.value;
                if (value === CREATE_VALUE) {
                  setCreatingTag(true);
                  setNewTag("");
                  return;
                }
                setPlatformLabel(value);
              }}
              style={inputStyle}
            >
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
              <option value={CREATE_VALUE}>＋ New source tag…</option>
            </select>
          )}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: SNAPSHOT_THEME.mute }}>
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
          Recurring (monthly)
        </label>
        <label style={labelStyle}>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} style={ghostBtn}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={primaryBtn}>
            {saving ? "Saving…" : initial ? "Save changes" : "Save entry"}
          </button>
        </div>
      </form>
    </div>
  );
}

const kickerStyle: CSSProperties = {
  margin: 0,
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.gold
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 11,
  color: SNAPSHOT_THEME.mute
};

const inputStyle: CSSProperties = {
  background: "#070A0F",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 10,
  padding: "9px 11px",
  color: SNAPSHOT_THEME.ink,
  font: "inherit",
  fontSize: 12
};

const ghostBtn: CSSProperties = {
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: "transparent",
  color: SNAPSHOT_THEME.mute,
  borderRadius: 999,
  padding: "8px 12px",
  font: "inherit",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap"
};

const primaryBtn: CSSProperties = {
  ...ghostBtn,
  borderColor: SNAPSHOT_THEME.gold,
  color: SNAPSHOT_THEME.gold,
  background: SNAPSHOT_THEME.goldSoft
};
