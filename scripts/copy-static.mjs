import { cpSync, mkdirSync } from "fs";
import path from "path";

const root = process.cwd();
mkdirSync(path.join(root, "public"), { recursive: true });

const copies = [
  ["index.html", "public/index.html"],
  ["login.html", "public/login.html"],
  ["script.js", "public/script.js"],
  ["firebase.js", "public/firebase.js"],
  ["dashboard", "public/dashboard"],
  ["views", "public/views"],
  ["auth", "public/auth"]
];

for (const [from, to] of copies) {
  cpSync(path.join(root, from), path.join(root, to), { recursive: true });
}
