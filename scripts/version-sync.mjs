#!/usr/bin/env node
/*
 * Version Sync Script
 * Scans repository files for hard-coded dependency version mentions and ensures
 * they match the authoritative versions in root package.json dependencies & devDependencies.
 *
 * Use Cases:
 * - Docs referencing specific versions (e.g., Next.js 15.5.3) stay aligned.
 * - Instruction files (.github/instructions/*.md) remain accurate after upgrades.
 *
 * Strategy:
 * 1. Load root package.json.
 * 2. Build a map of package->version (strip workspace ranges, keep exact spec).
 * 3. Scan a configurable set of file globs for patterns:
 *    - `next@<version>` or `next <version>`
 *    - `"next": "15.5.3"` (JSON excerpts in docs)
 *    - Generic: `<pkg>@<semver>` and `"<pkg>" version <semver>`
 * 4. Replace only when the version differs.
 * 5. Provide --check mode (exit 1 if drift) and default write mode.
 *
 * Limitations:
 * - Does not upgrade dependencies; it propagates existing versions.
 * - Ignores code inside node_modules.
 *
 * Flags:
 *   --check    : read-only; reports mismatches
 *   --include= : comma list of glob-like substrings (simple substring match on path)
 *   --verbose  : extra logging
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const PKG_PATH = path.join(ROOT, 'package.json');
const args = process.argv.slice(2);
const CHECK_MODE = args.includes('--check');
const VERBOSE = args.includes('--verbose');
const includeArg = args.find((a) => a.startsWith('--include='));
const INCLUDE_FILTERS = includeArg
  ? includeArg.replace('--include=', '').split(',').filter(Boolean)
  : [];

function log(...m) {
  if (VERBOSE) console.log('[version-sync]', ...m);
}

function loadPackageJson() {
  const raw = fs.readFileSync(PKG_PATH, 'utf8');
  return JSON.parse(raw);
}

function buildVersionMap(pkg) {
  const map = new Map();
  const add = (deps = {}) => {
    for (const [k, v] of Object.entries(deps)) {
      map.set(k, v);
    }
  };
  add(pkg.dependencies);
  add(pkg.devDependencies);
  return map;
}

function shouldProcess(file) {
  if (file.includes('node_modules')) return false;
  if (INCLUDE_FILTERS.length === 0) return true;
  return INCLUDE_FILTERS.some((f) => file.includes(f));
}

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'playwright-report',
]);
const MAX_DEPTH = 12; // safety guard
function walk(dir, depth = 0) {
  const out = [];
  if (depth > MAX_DEPTH) return out;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!EXCLUDE_DIRS.has(e.name)) {
        out.push(...walk(full, depth + 1));
      }
    } else {
      out.push(full);
    }
  }
  return out;
}

// Regex builder for a given package capturing the version part
function makePatternsFor(pkg) {
  // Matches pkg@1.2.3, pkg @ 1.2.3, "pkg": "1.2.3", pkg version 1.2.3
  return [
    new RegExp(`${pkg}[@ ]+(?<version>\\d+\\.\\d+\\.\\d+(?:[-a-zA-Z0-9+.]+)?)`, 'g'),
    new RegExp(`"${pkg}"\\s*:\\s*"(?<version>[^"\n]+)"`, 'g'),
    new RegExp(`${pkg}\\s+version\\s+(?<version>\\d+\\.\\d+\\.\\d+(?:[-a-zA-Z0-9+.]+)?)`, 'g'),
  ];
}

function replaceVersions(content, pkg, targetVersion, report) {
  let changed = false;
  const patterns = makePatternsFor(pkg);
  for (const pattern of patterns) {
    content = content.replace(pattern, (match, ...rest) => {
      const groups = rest.pop(); // groups at end
      const found = groups?.version;
      if (!found) return match;
      if (found === targetVersion) return match; // already correct
      report.push({ pkg, from: found, to: targetVersion, match });
      changed = true;
      // Reconstruct keeping original prefix/syntax
      // Try to replace only version substring inside match
      return match.replace(found, targetVersion);
    });
  }
  return { content, changed };
}

function main() {
  const pkg = loadPackageJson();
  const versionMap = buildVersionMap(pkg);
  const files = walk(ROOT).filter((f) => shouldProcess(f) && /\.(md|ts|tsx|mjs|js|json)$/.test(f));

  const mismatches = [];
  const edits = [];
  for (const file of files) {
    let text = fs.readFileSync(file, 'utf8');
    let fileChanged = false;
    const localReports = [];
    for (const [dep, ver] of versionMap.entries()) {
      const { content, changed } = replaceVersions(text, dep, ver, localReports);
      if (changed) {
        fileChanged = true;
        text = content;
      }
    }
    if (fileChanged) {
      if (CHECK_MODE) {
        mismatches.push(...localReports.map((r) => ({ file, ...r })));
      } else {
        fs.writeFileSync(file, text);
        edits.push(...localReports.map((r) => ({ file, ...r })));
      }
    }
  }

  if (CHECK_MODE) {
    if (mismatches.length) {
      console.error('Version drift detected:');
      for (const m of mismatches) {
        console.error(` - ${m.file}: ${m.pkg} ${m.from} -> ${m.to}`);
      }
      process.exit(1);
    } else {
      console.log('No version drift detected.');
    }
  } else {
    if (edits.length === 0) {
      console.log('No changes needed. Versions already in sync.');
    } else {
      console.log('Updated version occurrences:');
      for (const e of edits) {
        console.log(` - ${e.file}: ${e.pkg} ${e.from} -> ${e.to}`);
      }
    }
  }
}

main();
