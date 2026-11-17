const STORAGE_KEY = "dimad_manual_source_tags_v1";

export const DEFAULT_SOURCE_TAGS = [
  "Cash / Wire",
  "Manual Entry",
  "Invoice",
  "Consulting",
  "Affiliate",
  "Other"
];

export function readLocalSourceTags(): string[] {
  if (typeof window === "undefined") return [...DEFAULT_SOURCE_TAGS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_SOURCE_TAGS];
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return [...DEFAULT_SOURCE_TAGS];
    return Array.from(new Set([...DEFAULT_SOURCE_TAGS, ...parsed.map((t) => String(t).trim()).filter(Boolean)]));
  } catch {
    return [...DEFAULT_SOURCE_TAGS];
  }
}

export function writeLocalSourceTags(tags: string[]) {
  if (typeof window === "undefined") return;
  const cleaned = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    /* ignore */
  }
}

export function addLocalSourceTag(tag: string) {
  const next = Array.from(new Set([...readLocalSourceTags(), tag.trim()].filter(Boolean)));
  writeLocalSourceTags(next);
  return next;
}
