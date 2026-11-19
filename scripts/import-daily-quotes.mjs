/**
 * Explicit CLI trigger for seeding / appending daily_quotes.
 * Does not run on build or boot — invoke manually:
 *
 *   node scripts/import-daily-quotes.mjs
 *   node scripts/import-daily-quotes.mjs --start=2026-12-01
 *
 * Requires Firebase Admin env (same as the Next app):
 *   FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *
 * Prefer the API when the Next server is already configured:
 *   curl -X POST http://localhost:3000/api/quotes/import \
 *     -H "Authorization: Bearer $QUOTES_IMPORT_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"useSeed":true,"startDate":"2026-12-01"}'
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = path.join(root, ".env.local");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID?.trim() || "dimad-b463c";
const COLLECTION = "daily_quotes";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const INITIAL_DAILY_QUOTES = [
  {
    quote:
      "Man is condemned to be free; because once thrown into the world, he is responsible for everything he does.",
    author: "Jean-Paul Sartre",
    context: "French Philosopher"
  },
  {
    quote: "I'd rather be optimistic and wrong than pessimistic and right.",
    author: "Elon Musk",
    context: "Founder of Tesla and SpaceX"
  },
  {
    quote: "If you want to improve, be content to be thought foolish and stupid.",
    author: "Epictetus",
    context: "Greek Philosopher"
  },
  {
    quote: "Becoming is better than being.",
    author: "Carol Dweck",
    context: "American Psychologist and Growth Mindset Pioneer"
  },
  {
    quote: "Life isn't about finding yourself. Life is about creating yourself.",
    author: "George Bernard Shaw",
    context: "Irish Playwright"
  },
  {
    quote:
      "There is an innocence in admiration; it is found in those to whom it has never yet occurred that they, too, might be admired some day.",
    author: "Friedrich Nietzsche",
    context: "German Philosopher"
  },
  {
    quote: "Do the thing you fear most and the death of fear is certain.",
    author: "Mark Twain",
    context: "American Writer"
  },
  {
    quote: "No one can make you feel inferior without your consent.",
    author: "Eleanor Roosevelt",
    context: "Former U.S. First Lady and Human Rights Advocate"
  },
  {
    quote: "The only true test of intelligence is if you get what you want out of life.",
    author: "Naval Ravikant",
    context: "Co-founder of AngelList"
  },
  {
    quote: "I was taught the way of progress is neither swift nor easy.",
    author: "Marie Curie",
    context: "First Woman Nobel Prize Winner (Physics) 1903"
  },
  {
    quote: "Those who lack the courage will always find a philosophy to justify it.",
    author: "Albert Camus",
    context: "Nobel Prize in Literature 1957"
  },
  {
    quote:
      "You can make a million excuses for why something didn't go well, but ultimately, just fix it and get on with it. Be a solutions person.",
    author: "Emily Weiss",
    context: "Founder of Glossier"
  },
  {
    quote:
      "Everything can be taken from a man but one thing: the last of the human freedoms—to choose one's attitude in any given set of circumstances.",
    author: "Viktor Frankl",
    context: "Psychiatrist and Holocaust Survivor"
  },
  {
    quote: "It is a joy to be hidden and a disaster not to be found.",
    author: "Donald Winnicott",
    context: "British Pediatrician"
  },
  {
    quote:
      "Remember your dreams and fight for them. You must know what you want from life. There is just one thing that makes your dream become impossible: the fear of failure.",
    author: "Paulo Coelho",
    context: "Author of 'The Alchemist.'"
  },
  {
    quote: "It is not that we have a short time to live, but that we waste a lot of it.",
    author: "Seneca",
    context: "Roman Stoic Philosopher"
  },
  {
    quote: "You can't connect the dots looking forward; you can only connect them looking backwards.",
    author: "Steve Jobs",
    context: "Co-founder of Apple"
  },
  {
    quote:
      "Before you start a goal - let's take care of our insecurities because they are going to surface when you put yourself in the crucible and you're suffering.",
    author: "David Goggins",
    context: "Motivational Speaker and Athlete"
  },
  {
    quote:
      "The object of life is not to be on the side of the majority, but to escape finding oneself in the ranks of the insane.",
    author: "Marcus Aurelius",
    context: "Roman Emperor"
  },
  {
    quote:
      "One of my favorite insights is that we sacrifice the thing we want for the thing that's supposed to get it. So we sacrifice happiness in order to be successful, so that when we're finally sufficiently successful, we can actually be happy.",
    author: "Chris Williamson",
    context: "Host of 'Modern Wisdom' Podcast"
  }
];

function utcTodayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function isUtcDateKey(value) {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function addUtcDays(dateKey, days) {
  if (!isUtcDateKey(dateKey)) throw new Error(`invalid_utc_date_key:${dateKey}`);
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT || "";
  if (raw) {
    const parsed = JSON.parse(raw);
    return cert({
      projectId: parsed.project_id || PROJECT_ID,
      clientEmail: parsed.client_email || "",
      privateKey: (parsed.private_key || "").replace(/\\n/g, "\n")
    });
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (clientEmail && privateKey) {
    return cert({ projectId: PROJECT_ID, clientEmail, privateKey });
  }
  return null;
}

function getDb() {
  const existing = getApps()[0];
  if (!existing) {
    const credential = loadCredential();
    if (!credential) throw new Error("missing_firebase_admin_credentials");
    initializeApp({ credential, projectId: PROJECT_ID });
  }
  return getFirestore();
}

function parseArgs(argv) {
  let startDate;
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg.startsWith("--start=")) startDate = arg.slice("--start=".length).trim();
  }
  return { startDate, dryRun };
}

async function resolveStartDate(db, startDate) {
  if (startDate) {
    if (!isUtcDateKey(startDate)) throw new Error(`invalid_start_date:${startDate}`);
    return startDate;
  }
  const latest = await db.collection(COLLECTION).orderBy("date", "desc").limit(1).get();
  if (latest.empty) return utcTodayKey();
  const latestDate = String(latest.docs[0].data()?.date || latest.docs[0].id || "").trim();
  if (!isUtcDateKey(latestDate)) return utcTodayKey();
  return addUtcDays(latestDate, 1);
}

async function main() {
  const { startDate: startArg, dryRun } = parseArgs(process.argv.slice(2));
  const db = getDb();
  const startDate = await resolveStartDate(db, startArg);
  const written = [];
  const skipped = [];

  console.log(`[daily_quotes] startDate=${startDate} items=${INITIAL_DAILY_QUOTES.length} dryRun=${dryRun}`);

  const planned = INITIAL_DAILY_QUOTES.map((item, index) => ({
    date: addUtcDays(startDate, index),
    item
  }));

  const refs = planned.map(({ date }) => db.collection(COLLECTION).doc(date));
  const snaps = await db.getAll(...refs);

  if (dryRun) {
    planned.forEach((entry, idx) => {
      if (snaps[idx].exists) {
        skipped.push(entry.date);
        console.warn(`[daily_quotes] would skip existing ${entry.date}`);
      } else {
        written.push(entry.date);
        console.log(`[daily_quotes] would write ${entry.date} — ${entry.item.author}`);
      }
    });
  } else {
    const batch = db.batch();
    let ops = 0;
    planned.forEach((entry, idx) => {
      if (snaps[idx].exists) {
        skipped.push(entry.date);
        console.warn(`[daily_quotes] skip existing ${entry.date} — will not overwrite`);
        return;
      }
      batch.set(refs[idx], {
        quote: entry.item.quote,
        author: entry.item.author,
        context: entry.item.context,
        date: entry.date,
        createdAt: FieldValue.serverTimestamp()
      });
      written.push(entry.date);
      ops += 1;
    });
    if (ops > 0) await batch.commit();
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        startDate,
        written,
        skipped,
        count: { written: written.length, skipped: skipped.length, total: planned.length }
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
