import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { addUtcDays, isUtcDateKey, utcTodayKey } from "./date";
import { DAILY_QUOTES_COLLECTION } from "./getDailyQuote";
import type { ImportQuotesResult, QuoteImportItem } from "./types";

const BATCH_LIMIT = 400;

async function resolveStartDate(startDate?: string): Promise<string> {
  if (startDate) {
    if (!isUtcDateKey(startDate)) {
      throw new Error(`invalid_start_date:${startDate}`);
    }
    return startDate;
  }

  const db = getAdminDb();
  const latest = await db.collection(DAILY_QUOTES_COLLECTION).orderBy("date", "desc").limit(1).get();
  if (latest.empty) {
    return utcTodayKey();
  }

  const latestDate = String(latest.docs[0].data()?.date || latest.docs[0].id || "").trim();
  if (!isUtcDateKey(latestDate)) {
    return utcTodayKey();
  }
  return addUtcDays(latestDate, 1);
}

/**
 * Bulk-import quotes into `daily_quotes` with sequential UTC date IDs.
 * Never overwrites existing date docs — skips and warns instead.
 */
export async function importDailyQuotes(
  items: QuoteImportItem[],
  options: { startDate?: string } = {}
): Promise<ImportQuotesResult> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("import_items_required");
  }

  const startDate = await resolveStartDate(options.startDate);
  const db = getAdminDb();
  const written: string[] = [];
  const skipped: string[] = [];

  const planned = items.map((item, index) => {
    const date = addUtcDays(startDate, index);
    return { date, item };
  });

  for (let i = 0; i < planned.length; i += BATCH_LIMIT) {
    const chunk = planned.slice(i, i + BATCH_LIMIT);
    const refs = chunk.map(({ date }) => db.collection(DAILY_QUOTES_COLLECTION).doc(date));
    const snaps = await db.getAll(...refs);

    const batch = db.batch();
    let ops = 0;

    chunk.forEach((entry, idx) => {
      const snap = snaps[idx];
      if (snap.exists) {
        console.warn(`[daily_quotes] skip existing ${entry.date} — will not overwrite`);
        skipped.push(entry.date);
        return;
      }

      const quote = String(entry.item.quote || "").trim();
      const author = String(entry.item.author || "").trim();
      const context = String(entry.item.context || "").trim();
      if (!quote || !author) {
        console.warn(`[daily_quotes] skip invalid item for ${entry.date}`);
        skipped.push(entry.date);
        return;
      }

      batch.set(refs[idx], {
        quote,
        author,
        context,
        date: entry.date,
        createdAt: FieldValue.serverTimestamp()
      });
      written.push(entry.date);
      ops += 1;
    });

    if (ops > 0) {
      await batch.commit();
    }
  }

  return { written, skipped, startDate };
}
