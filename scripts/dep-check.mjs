#!/usr/bin/env node
/*
 * Dependency Check Script
 * Uses depcheck to identify unused dependencies and missing dependencies
 * Reports orphaned dependencies from package.json vs actual usage
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PKG_PATH = path.join(ROOT, "package.json");

function log(...m) {
  console.log("[dep-check]", ...m);
}

function loadPackageJson() {
  const raw = fs.readFileSync(PKG_PATH, "utf8");
  return JSON.parse(raw);
}

function runDepcheck() {
  try {
    const output = execSync("npx depcheck --json", {
      cwd: ROOT,
      encoding: "utf8",
    });
    return JSON.parse(output);
  } catch (error) {
    console.error("Failed to run depcheck:", error.message);
    process.exit(1);
  }
}

function main() {
  const pkg = loadPackageJson();
  const result = runDepcheck();

  log("Dependency check results:");

  // Unused dependencies
  const unusedDeps = [
    ...Object.keys(result.dependencies || {}),
    ...Object.keys(result.devDependencies || {}),
  ];

  if (unusedDeps.length > 0) {
    log("\n❌ Unused dependencies:");
    unusedDeps.forEach((dep) => {
      const version = pkg.dependencies?.[dep] || pkg.devDependencies?.[dep];
      log(`  - ${dep}@${version}`);
    });
  } else {
    log("\n✅ No unused dependencies found");
  }

  // Missing dependencies
  const missingDeps = Object.keys(result.missing || {});
  if (missingDeps.length > 0) {
    log("\n⚠️  Missing dependencies (used but not declared):");
    missingDeps.forEach((dep) => {
      const files = result.missing[dep];
      log(`  - ${dep} (used in: ${files.join(", ")})`);
    });
  } else {
    log("\n✅ No missing dependencies found");
  }

  // Summary
  const totalDeps =
    Object.keys(pkg.dependencies || {}).length +
    Object.keys(pkg.devDependencies || {}).length;
  log(
    `\n📊 Summary: ${totalDeps} total dependencies, ${unusedDeps.length} unused, ${missingDeps.length} missing`,
  );

  if (unusedDeps.length > 0 || missingDeps.length > 0) {
    log('\n💡 Run "pnpm remove <package>" to remove unused dependencies');
    log('💡 Run "pnpm add <package>" to add missing dependencies');
    process.exit(1);
  } else {
    log("\n🎉 All dependencies are properly declared and used!");
  }
}

main();
