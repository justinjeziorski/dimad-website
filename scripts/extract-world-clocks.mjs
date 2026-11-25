import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const s = fs.readFileSync(path.join(root, "script.js"), "utf8");
const m = s.match(/const WORLD_CLOCK_CITIES = (\[[\s\S]*?\n\]);/);
if (!m) {
  console.error("WORLD_CLOCK_CITIES not found");
  process.exit(1);
}
const arr = m[1].replace(/'/g, '"');
const out = `export type WorldClockCity = { id: string; city: string; tz: string; group: string };

/** Full timezone city catalog (shared with legacy WORLD_CLOCKS picker). */
export const WORLD_CLOCK_CITIES: WorldClockCity[] = ${arr};
`;
const dest = path.join(root, "src", "lib", "city", "worldClockCities.ts");
fs.writeFileSync(dest, out);
console.log("wrote", dest, "entries≈", (arr.match(/id:/g) || []).length);
