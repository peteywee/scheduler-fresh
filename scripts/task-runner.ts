#!/usr/bin/env ts-node
/*
 A simple task runner:
 - Discovers npm scripts from package.json files (root + subfolders) and .vscode/tasks.json
 - Runs up to CONCURRENCY tasks in parallel (default 3)
 - Records failures, retries up to MAX_RETRIES (default 3), and continues with other tasks
 - When tasks finish (success or exhausted retries) the runner exits with summary
*/

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

type Task = {
  id: string;
  cmd: string;
  cwd: string;
  attempts: number;
  maxRetries: number;
};

const ROOT = process.cwd();
const CONCURRENCY = Number(process.env.CONCURRENCY) || 3;
const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 3;
const DISCOVER_PACKAGES = true;

function findPackageJsonPaths(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === "package.json") results.push(full);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
      try {
        results.push(...findPackageJsonPaths(full));
      } catch {
        // ignore permission errors
      }
    }
  }
  return results;
}

function discoverTasks(): Task[] {
  const tasks: Task[] = [];

  // 1) package.json scripts (root + nested)
  const pkgPaths = DISCOVER_PACKAGES ? findPackageJsonPaths(ROOT) : [path.join(ROOT, "package.json")];
  for (const p of pkgPaths) {
    try {
      const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
      const scripts = pkg.scripts || {};
      const pkgDir = path.dirname(p);
      for (const [name, _cmd] of Object.entries(scripts)) {
        // Skip lifecycle scripts that are not useful for running here
        if (["prepare", "preinstall", "postinstall", "precommit"].includes(name)) continue;
        tasks.push({ id: `${path.relative(ROOT, pkgDir) || "."}:${name}`, cmd: `pnpm run ${name}`, cwd: pkgDir, attempts: 0, maxRetries: MAX_RETRIES });
      }
    } catch {
      // ignore
    }
  }

  // 2) vscode tasks.json if present
  const vscodeTasks = path.join(ROOT, ".vscode", "tasks.json");
  if (fs.existsSync(vscodeTasks)) {
    try {
      const content = JSON.parse(fs.readFileSync(vscodeTasks, "utf8"));
      const vsTasks = content.tasks || [];
      for (const t of vsTasks) {
        if (t.command) {
          const id = `vscode:${t.label || t.command}`;
          tasks.push({ id, cmd: t.command, cwd: ROOT, attempts: 0, maxRetries: MAX_RETRIES });
        }
      }
    } catch {
      // ignore
    }
  }

  // Deduplicate by id (keep first)
  const seen = new Set<string>();
  const uniq = tasks.filter((t) => {
    if (seen.has(t.id)) return false; seen.add(t.id); return true;
  });
  return uniq;
}

function runTask(t: Task) {
  t.attempts++;
  console.log(`[TASK START] ${t.id} (attempt ${t.attempts}/${t.maxRetries + 1}) -> ${t.cmd} @ ${t.cwd}`);
  const parts = t.cmd.split(" ");
  const child = spawn(parts[0], parts.slice(1), { cwd: t.cwd, stdio: ["ignore", "pipe", "pipe"], shell: true });

  child.stdout.on("data", (d) => process.stdout.write(`[${t.id}] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[${t.id} ERR] ${d}`));

  return new Promise<{ success: boolean; code: number | null }>((resolve) => {
    child.on("exit", (code) => {
      const ok = code === 0;
      console.log(`[TASK END] ${t.id} -> ${ok ? "SUCCESS" : `FAIL (${code})`}`);
      resolve({ success: ok, code });
    });
    child.on("error", (err) => {
      console.error(`[TASK ERROR] ${t.id}`, err);
      resolve({ success: false, code: null });
    });
  });
}

async function main() {
  const discovered = discoverTasks();
  if (discovered.length === 0) {
    console.log("No tasks discovered.");
    process.exit(0);
  }

  console.log(`Discovered ${discovered.length} tasks, concurrency=${CONCURRENCY}, maxRetries=${MAX_RETRIES}`);

  const queue = [...discovered];
  const failed: { task: Task; lastCode: number | null }[] = [];

  let running = 0;

  // no-op placeholder for tracking if needed later
  void 0;

  async function tick() {
    while (running < CONCURRENCY && queue.length > 0) {
      const t = queue.shift()!;
      running++;
      runTask(t).then(({ success, code }) => {
        running--;
        if (success) {
          // done
        } else {
          if (t.attempts <= t.maxRetries) {
            console.log(`[TASK RETRY] ${t.id} scheduling retry #${t.attempts}`);
            // small backoff
            setTimeout(() => queue.push(t), 1000 * Math.min(30, t.attempts * 2));
          } else {
            console.log(`[TASK FAIL] ${t.id} exhausted retries`);
            failed.push({ task: t, lastCode: code });
          }
        }
        // continue scheduling
        setImmediate(tick);
      });
    }

    // if nothing running and queue empty, we're done
    if (running === 0 && queue.length === 0) {
      console.log("All tasks processed.");
      if (failed.length > 0) {
        console.log("Summary of failed tasks:");
        for (const f of failed) console.log(` - ${f.task.id} lastExit=${f.lastCode}`);
        process.exit(2);
      } else {
        console.log("All tasks succeeded.");
        process.exit(0);
      }
    }
  }

  process.on("SIGINT", () => {
    console.log("Received SIGINT, exiting...");
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    console.log("Received SIGTERM, exiting...");
    process.exit(143);
  });

  tick();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
