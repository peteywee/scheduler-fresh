#!/usr/bin/env node
/*
 * Security Audit Script
 * Runs automated security audits using audit-ci
 * Checks for vulnerabilities in dependencies
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const ROOT = process.cwd();

function log(...m) {
  console.log('[security-audit]', ...m);
}

function runAuditCi() {
  const configPath = `${ROOT}/audit-ci.json`;
  if (!existsSync(configPath)) {
    log(`❌ Missing audit-ci.json config file at ${configPath}`);
    process.exit(1);
  }
  try {
    log('Running security audit with audit-ci...');
    execSync('npx audit-ci --config audit-ci.json', {
      cwd: ROOT,
      stdio: 'inherit',
    });
    log('✅ Security audit passed');
  } catch (error) {
    log('❌ Security audit failed');
    log('Run "pnpm audit" for more details');
    process.exit(1);
  }
}

function main() {
  runAuditCi();
}

main();
