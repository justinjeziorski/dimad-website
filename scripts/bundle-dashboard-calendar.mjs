import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outfile = path.join(root, "public", "embeds", "dashboard-calendar.js");

mkdirSync(path.dirname(outfile), { recursive: true });

function resolveSrcAlias(spec) {
  const rel = spec.slice(2);
  const base = path.join(root, "src", rel);
  if (existsSync(base) && !base.endsWith(path.sep)) return base;
  for (const ext of [".tsx", ".ts", ".jsx", ".js", ".json"]) {
    const candidate = base + ext;
    if (existsSync(candidate)) return candidate;
  }
  for (const ext of ["/index.tsx", "/index.ts", "/index.js"]) {
    const candidate = base + ext;
    if (existsSync(candidate)) return candidate;
  }
  return base;
}

const aliasPlugin = {
  name: "alias-and-shims",
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => ({
      path: resolveSrcAlias(args.path)
    }));
    build.onResolve({ filter: /^next\/font\/google$/ }, () => ({
      path: path.join(root, "src", "embeds", "shims", "next-font-google.ts")
    }));
    build.onResolve({ filter: /^next\/font\/local$/ }, () => ({
      path: path.join(root, "src", "embeds", "shims", "next-font-google.ts")
    }));
    build.onResolve({ filter: /^next\/image$/ }, () => ({
      path: path.join(root, "src", "embeds", "shims", "next-image.tsx")
    }));
    build.onResolve({ filter: /^next\/script$/ }, () => ({
      path: path.join(root, "src", "embeds", "shims", "empty.ts")
    }));
  }
};

await esbuild.build({
  entryPoints: [path.join(root, "src", "embeds", "dashboard-calendar-entry.tsx")],
  bundle: true,
  format: "iife",
  globalName: "DimadDashboardCalendar",
  outfile,
  platform: "browser",
  target: ["es2020"],
  jsx: "automatic",
  minify: true,
  legalComments: "none",
  sourcemap: false,
  treeShaking: true,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  plugins: [aliasPlugin],
  loader: {
    ".ts": "ts",
    ".tsx": "tsx"
  },
  logLevel: "info"
});

console.log("bundled", path.relative(root, outfile));
