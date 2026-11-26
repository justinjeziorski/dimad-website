import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "embeds");
mkdirSync(outDir, { recursive: true });

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

const targets = [
  {
    entry: "src/embeds/finances-workspace-entry.tsx",
    outfile: "finances-workspace.js",
    globalName: "DimadFinancesWorkspace"
  },
  {
    entry: "src/embeds/growth-workspace-entry.tsx",
    outfile: "growth-workspace.js",
    globalName: "DimadGrowthWorkspace"
  },
  {
    entry: "src/embeds/market-board-entry.tsx",
    outfile: "market-board.js",
    globalName: "DimadMarketBoard"
  }
];

for (const target of targets) {
  await esbuild.build({
    entryPoints: [path.join(root, target.entry)],
    bundle: true,
    format: "iife",
    globalName: target.globalName,
    outfile: path.join(outDir, target.outfile),
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
  console.log("bundled", path.join("public", "embeds", target.outfile));
}
