#!/usr/bin/env -S node --import ./scripts/task-runner-register.mjs
/*
 A simple task runner:
 - Discovers npm scripts from package.json files (root + subfolders) and .vscode/tasks.json
 - Runs up to CONCURRENCY tasks in parallel (default 3)
 - Records failures, retries up to MAX_RETRIES (default 3), and continues with other tasks
 - Supports filtering via TASK_INCLUDE/TASK_EXCLUDE (comma-separated regex or literals)
 - Supports named presets via TASK_PRESET defined in task-runner.config.json
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
const DEFAULT_EXCLUDE_PATTERNS = ["\bkill\b", "\bstop\b", "\btask-runner\b"];
const CONFIG_PATH =
  process.env.TASK_CONFIG_PATH || path.join(ROOT, "task-runner.config.json");
const DISABLE_FLAG_FILENAME = ".task-runner.disabled";
const DISABLE_FLAG_PATH = path.join(ROOT, DISABLE_FLAG_FILENAME);

type TaskPreset = {
  description?: string;
  include?: string[];
  exclude?: string[];
};

type TaskRunnerConfig = {
  presets?: Record<string, TaskPreset>;
};

type CompiledFilter = {
  raw: string;
  matcher: (value: string) => boolean;
};

function getDisableReason(): string | null {
  const envValue = process.env.TASK_RUNNER_DISABLED;
  if (envValue && envValue !== "0" && envValue.toLowerCase() !== "false") {
    return `Disabled via TASK_RUNNER_DISABLED=${envValue}. Remove or reset the env var to re-enable.`;
  }

  if (fs.existsSync(DISABLE_FLAG_PATH)) {
    return `Disable flag detected at ${DISABLE_FLAG_FILENAME}. Delete this file to re-enable.`;
  }

  return null;
}

function escapeForLiteralRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileFilterList(patterns: string[]): CompiledFilter[] {
  return patterns
    .map((pattern) => compileFilter(pattern))
    .filter((filter): filter is CompiledFilter => Boolean(filter));
}

function compileFilter(pattern: string): CompiledFilter | null {
  const trimmed = pattern.trim();
  if (!trimmed) return null;

  try {
    const regex = new RegExp(trimmed, "i");
    return {
      raw: trimmed,
      matcher: (value: string) => regex.test(value),
    };
  } catch (err) {
    console.warn(
      `[FILTER] Invalid regex '${trimmed}'. Falling back to case-insensitive literal match. Please check your regex syntax if you intended a pattern.`,
      err,
    );
    const escaped = new RegExp(escapeForLiteralRegex(trimmed), "i");
    return {
      raw: trimmed,
      matcher: (value: string) => escaped.test(value),
    };
  }
}

function readEnvPatterns(envKey: "TASK_INCLUDE" | "TASK_EXCLUDE"): string[] {
  const raw = process.env[envKey];
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

function loadDefaultExcludes(): CompiledFilter[] {
  if (process.env.ALLOW_DESTRUCTIVE === "1") {
    return [];
  }
  return compileFilterList(DEFAULT_EXCLUDE_PATTERNS);
}

function loadConfig(): TaskRunnerConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return { presets: {} };
    }

    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as TaskRunnerConfig;
    if (!parsed || typeof parsed !== "object") {
      console.warn(
        `[CONFIG] ${CONFIG_PATH} is not a valid config object. Expected a JSON object with an optional 'presets' property.`,
      );
      return { presets: {} };
    }
    return {
      presets: parsed.presets || {},
    };
  } catch (err) {
    console.warn(`[CONFIG] Failed to read ${CONFIG_PATH}`, err);
    return { presets: {} };
  }
}

function resolvePresetPatterns(
  config: TaskRunnerConfig,
  names: string[],
): {
  includePatterns: string[];
  excludePatterns: string[];
} {
  const includePatterns: string[] = [];
  const excludePatterns: string[] = [];

  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;
    const preset = config.presets?.[name];
    if (!preset) {
      console.warn(`[PRESET] '${name}' not found in ${CONFIG_PATH}.`);
      continue;
    }
    if (preset.description) {
      console.log(`[PRESET] ${name}: ${preset.description}`);
    }
    if (preset.include?.length) {
      includePatterns.push(...preset.include);
    }
    if (preset.exclude?.length) {
      excludePatterns.push(...preset.exclude);
    }
  }

  return { includePatterns, excludePatterns };
}

function passesFilters(
  task: Task,
  includes: CompiledFilter[],
  excludes: CompiledFilter[],
): boolean {
  const surfaces = [task.id, task.cmd, `${task.id} ${task.cmd}`];
  if (
    includes.length > 0 &&
    !includes.some((f) => surfaces.some((value) => f.matcher(value)))
  ) {
    return false;
  }
  if (excludes.some((f) => surfaces.some((value) => f.matcher(value)))) {
    return false;
  }
  return true;
}

function findPackageJsonPaths(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === "package.json") results.push(full);
    if (
      entry.isDirectory() &&
      entry.name !== "node_modules" &&
      entry.name !== ".git"
    ) {
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
  const pkgPaths = DISCOVER_PACKAGES
    ? findPackageJsonPaths(ROOT)
    : [path.join(ROOT, "package.json")];
  for (const p of pkgPaths) {
    try {
      const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
      const scripts = pkg.scripts || {};
      const pkgDir = path.dirname(p);
      for (const [name, _cmd] of Object.entries(scripts)) {
        // Skip lifecycle scripts that are not useful for running here
        if (
          ["prepare", "preinstall", "postinstall", "precommit"].includes(name)
        )
          continue;
        tasks.push({
          id: `${path.relative(ROOT, pkgDir) || "."}:${name}`,
          cmd: `pnpm run ${name}`,
          cwd: pkgDir,
          attempts: 0,
          maxRetries: MAX_RETRIES,
        });
      const child = spawn(t.cmd, { cwd: t.cwd, stdio: ["ignore", "pipe", "pipe"], shell: true });
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
          tasks.push({
            id,
            cmd: t.command,
            cwd: ROOT,
            attempts: 0,
            maxRetries: MAX_RETRIES,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  // Deduplicate by id (keep first)
  const seen = new Set<string>();
  const uniq = tasks.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
  return uniq;
}

function runTask(t: Task) {
  t.attempts++;
  console.log(
    `[TASK START] ${t.id} (attempt ${t.attempts}/${t.maxRetries + 1}) -> ${t.cmd} @ ${t.cwd}`,
  );
  const parts = t.cmd.split(" ");
  const child = spawn(parts[0], parts.slice(1), {
    cwd: t.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });

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
  const disableReason = getDisableReason();
  if (disableReason) {
    console.log(`[TASK RUNNER DISABLED] ${disableReason}`);
    process.exit(0);
  }

  const discovered = discoverTasks();
  if (discovered.length === 0) {
    console.log("No tasks discovered.");
    process.exit(0);
  }

  const config = loadConfig();
  const presetNames = (process.env.TASK_PRESET || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (presetNames.length > 0) {
    console.log(`Applying TASK_PRESET: ${presetNames.join(", ")}`);
  }

  const {
    includePatterns: presetIncludePatterns,
    excludePatterns: presetExcludePatterns,
  } = resolvePresetPatterns(config, presetNames);

  const envIncludePatterns = readEnvPatterns("TASK_INCLUDE");
  const envExcludePatterns = readEnvPatterns("TASK_EXCLUDE");

  const includeFilters = [
    ...compileFilterList(presetIncludePatterns),
    ...compileFilterList(envIncludePatterns),
  ];
  const defaultExcludeFilters = loadDefaultExcludes();
  const presetExcludeFilters = compileFilterList(presetExcludePatterns);
  const envExcludeFilters = compileFilterList(envExcludePatterns);
  const allExcludeFilters = [
    ...defaultExcludeFilters,
    ...presetExcludeFilters,
    ...envExcludeFilters,
  ];

  if (presetIncludePatterns.length > 0) {
    console.log(`Preset include filters: ${presetIncludePatterns.join(", ")}`);
  }
  if (envIncludePatterns.length > 0) {
    console.log(
      `Applying TASK_INCLUDE filters: ${envIncludePatterns.join(", ")}`,
    );
  }
  if (defaultExcludeFilters.length > 0) {
    console.log(
      `Applying default safety filters (set ALLOW_DESTRUCTIVE=1 to bypass): ${defaultExcludeFilters.map((f) => f.raw).join(", ")}`,
    );
  }
  if (presetExcludePatterns.length > 0) {
    console.log(`Preset exclude filters: ${presetExcludePatterns.join(", ")}`);
  }
  if (envExcludePatterns.length > 0) {
    console.log(
      `Applying TASK_EXCLUDE filters: ${envExcludePatterns.join(", ")}`,
    );
  }

  const filtered = discovered.filter((task) =>
    passesFilters(task, includeFilters, allExcludeFilters),
  );

  if (filtered.length === 0) {
    console.log("No tasks remaining after applying filters. Exiting.");
    process.exit(0);
  }

  console.log(
    `Discovered ${discovered.length} tasks (${filtered.length} after filters), concurrency=${CONCURRENCY}, maxRetries=${MAX_RETRIES}`,
  );

  if (process.env.DRY_RUN === "1") {
    console.log("DRY_RUN=1 set. Listing tasks without executing:");
    for (const t of filtered) {
      console.log(` - ${t.id} :: ${t.cmd} @ ${t.cwd}`);
    }
    console.log("Exiting early due to dry-run mode.");
    process.exit(0);
  }

  const queue = [...filtered];
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
            setTimeout(
              () => queue.push(t),
              1000 * Math.min(30, t.attempts * 2),
            );
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
        for (const f of failed)
          console.log(` - ${f.task.id} lastExit=${f.lastCode}`);
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
