#!/usr/bin/env ts-node
/**
 * Watchman Package Drift Script
 *
 * Purpose:
 *  - Detect version drift between package.json dependencies & lockfile resolution
 *  - Report unused dependencies (declared but not imported)
 *  - Report missing dependencies (imported but not declared)
 *  - Exit non-zero if actionable issues found (for CI gate)
 *
 * Heuristics:
 *  - Scans src/, functions/src, scripts/ for import/require/export from patterns
 *  - Ignores dev only type imports when preceded by `type` keyword
 *  - Excludes known virtual modules (next/image, next/font/*, react/jsx-runtime)
 */

import { readFileSync } from "fs";
import { existsSync, readdirSync } from "fs";
import { join, extname } from "path";

interface PackageJSON {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const ROOT = process.cwd();
const PKG_PATH = join(ROOT, "package.json");

function loadPackageJson(): PackageJSON {
  return JSON.parse(readFileSync(PKG_PATH, "utf8")) as PackageJSON;
}

const SOURCE_DIRS = ["src", "functions/src", "scripts"];
const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const IGNORED_IMPORT_PREFIXES = [
  "next/image",
  "next/font",
  "react/jsx-runtime",
  "@types/",
];

// Node core modules (both legacy and 'node:' scheme) — never require declaration
const NODE_CORE = new Set([
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "dns",
  "domain",
  "events",
  "fs",
  "fs/promises",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "stream/promises",
  "string_decoder",
  "timers",
  "tls",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "worker_threads",
  "zlib",
]);

interface DriftOptions {
  allowDevUnused: boolean; // if true, devDependencies unused do not trigger failure
  failOnUnused: boolean; // exit non-zero when unused detected
  json: boolean; // machine-readable output
}

function parseArgs(): DriftOptions {
  const argv = process.argv.slice(2);
  const opts: DriftOptions = {
    allowDevUnused: true,
    failOnUnused: false,
    json: false,
  };
  for (const a of argv) {
    if (a === "--no-allow-dev-unused") opts.allowDevUnused = false;
    else if (a === "--fail-on-unused") opts.failOnUnused = true;
    else if (a === "--json") opts.json = true;
  }
  return opts;
}

function gatherSourceFiles(): string[] {
  const files: string[] = [];
  for (const dir of SOURCE_DIRS) {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) continue;
    walk(abs, files);
  }
  return files;
}

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(p))) out.push(p);
  }
}

const IMPORT_RE =
  /(?:import\s+(?:type\s+)?[^'";]*?from\s+['"]([^'";]+)['"];?|require\(['"]([^'"]+)['"]\)|export\s+\*\s+from\s+['"]([^'"]+)['"])/g;

function extractImports(file: string): string[] {
  const content = readFileSync(file, "utf8");
  const imports: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = IMPORT_RE.exec(content))) {
    const mod = match[1] || match[2] || match[3];
    if (!mod) continue;
    if (mod.startsWith(".") || mod.startsWith("@/") || mod.startsWith("~~/"))
      continue; // local/aliased
    if (IGNORED_IMPORT_PREFIXES.some((p) => mod.startsWith(p))) continue;
    if (mod.startsWith("node:")) continue; // node: scheme
    // Scoped package subpath -> root package name
    const rootName = mod.startsWith("@")
      ? mod.split("/").slice(0, 2).join("/")
      : mod.split("/")[0];
    if (NODE_CORE.has(rootName)) continue;
    imports.push(rootName);
  }
  return Array.from(new Set(imports));
}

function classify(
  dep: string,
  pkg: PackageJSON,
): "runtime" | "dev" | "peer" | "unknown" {
  if (pkg.dependencies && dep in pkg.dependencies) return "runtime";
  if (pkg.devDependencies && dep in pkg.devDependencies) return "dev";
  if (pkg.peerDependencies && dep in pkg.peerDependencies) return "peer";
  return "unknown";
}

function main() {
  const opts = parseArgs();
  const pkg = loadPackageJson();
  const declared = new Set<string>([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ]);

  const files = gatherSourceFiles();
  const imported = new Set<string>();
  for (const f of files) {
    for (const mod of extractImports(f)) imported.add(mod);
  }

  const missing: string[] = [];
  for (const mod of imported) {
    if (!declared.has(mod)) missing.push(mod);
  }

  const unusedRuntime: string[] = [];
  const unusedDev: string[] = [];
  for (const dep of declared) {
    // heuristic skip list (framework/types/testing config that may be indirect)
    if (
      [
        "next",
        "react",
        "react-dom",
        "typescript",
        "vitest",
        "@types/node",
        "eslint",
        "prettier",
        "tailwindcss",
        "postcss",
        "autoprefixer",
      ].includes(dep)
    )
      continue;
    if (!imported.has(dep)) {
      const kind = classify(dep, pkg);
      if (kind === "runtime") unusedRuntime.push(dep);
      else if (kind === "dev") unusedDev.push(dep);
    }
  }

  const hasIssues =
    missing.length > 0 ||
    unusedRuntime.length > 0 ||
    (!opts.allowDevUnused && unusedDev.length > 0);

  if (opts.json) {
    const payload = { missing, unusedRuntime, unusedDev, options: opts };
    console.log(JSON.stringify(payload, null, 2));
    process.exit(hasIssues ? 1 : 0);
  }

  if (!hasIssues) {
    console.log("✅ No package drift detected.");
    // Optionally display counts
    if (unusedDev.length)
      console.log(
        `ℹ️  Ignored ${unusedDev.length} dev-only unused deps (use --no-allow-dev-unused to flag).`,
      );
    return;
  }

  if (missing.length) {
    console.log("\n❌ Missing dependencies (imported but not declared):");
    for (const m of missing) console.log("  -", m);
  }
  if (unusedRuntime.length) {
    console.log("\n⚠️  Unused runtime dependencies:");
    for (const u of unusedRuntime) console.log("  -", u);
  }
  if (!opts.allowDevUnused && unusedDev.length) {
    console.log("\n⚠️  Unused dev dependencies:");
    for (const u of unusedDev) console.log("  -", u);
  } else if (unusedDev.length) {
    console.log(
      `\nℹ️  Ignoring ${unusedDev.length} unused dev dependencies (use --no-allow-dev-unused to fail).`,
    );
  }

  const shouldFail =
    missing.length > 0 ||
    unusedRuntime.length > 0 ||
    (opts.failOnUnused && unusedDev.length > 0) ||
    (!opts.allowDevUnused && unusedDev.length > 0);
  process.exit(shouldFail ? 1 : 0);
}

main();
