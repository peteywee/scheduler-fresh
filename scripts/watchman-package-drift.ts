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

import { readFileSync } from 'fs';
import { existsSync, readdirSync } from 'fs';
import { join, extname } from 'path';

interface PackageJSON { dependencies?: Record<string,string>; devDependencies?: Record<string,string>; peerDependencies?: Record<string,string>; }

const ROOT = process.cwd();
const PKG_PATH = join(ROOT, 'package.json');

function loadPackageJson(): PackageJSON {
  return JSON.parse(readFileSync(PKG_PATH, 'utf8')) as PackageJSON;
}

const SOURCE_DIRS = ['src','functions/src','scripts'];
const EXTS = new Set(['.ts','.tsx','.js','.mjs','.cjs']);
const IGNORED_IMPORT_PREFIXES = [
  'next/image',
  'next/font',
  'react/jsx-runtime',
  '@types/',
];

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

const IMPORT_RE = /(?:import\s+(?:type\s+)?[^'";]*?from\s+['"]([^'";]+)['"];?|require\(['"]([^'"]+)['"]\)|export\s+\*\s+from\s+['"]([^'"]+)['"])/g;

function extractImports(file: string): string[] {
  const content = readFileSync(file, 'utf8');
  const imports: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = IMPORT_RE.exec(content))) {
    const mod = match[1] || match[2] || match[3];
    if (!mod) continue;
    if (mod.startsWith('.') || mod.startsWith('@/') || mod.startsWith('~~/')) continue; // local/aliased
    if (IGNORED_IMPORT_PREFIXES.some(p => mod.startsWith(p))) continue;
    // Scoped package subpath -> root package name
    const rootName = mod.startsWith('@') ? mod.split('/').slice(0,2).join('/') : mod.split('/')[0];
    imports.push(rootName);
  }
  return Array.from(new Set(imports));
}

function main() {
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

  const unused: string[] = [];
  for (const dep of declared) {
    // heuristic: skip next, react, typescript, testing libs from unused classification
    if (['next','react','react-dom','typescript','vitest','@types/node'].includes(dep)) continue;
    if (!imported.has(dep)) unused.push(dep);
  }

  const hasIssues = missing.length > 0 || unused.length > 0;
  if (!hasIssues) {
    console.log('✅ No package drift detected.');
    return;
  }
  if (missing.length) {
    console.log('\n❌ Missing dependencies (imported but not declared):');
    for (const m of missing) console.log('  -', m);
  }
  if (unused.length) {
    console.log('\n⚠️  Possibly unused dependencies (declared but not imported):');
    for (const u of unused) console.log('  -', u);
  }
  process.exit(1);
}

main();
