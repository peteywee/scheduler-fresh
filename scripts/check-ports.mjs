// Node >= 20, pure ESM.
// A human-friendly port health checker used by the dev scripts.

import net from "node:net";
import process from "node:process";
import { performance } from "node:perf_hooks";

const DEFAULT_PORTS = [3000, 8080, 9099, 9199];
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_TIMEOUT_MS = 2000;

const COLOR = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const TRUE_STRINGS = new Set(["1", "true", "yes", "y", "on"]);
const FALSE_STRINGS = new Set(["0", "false", "no", "n", "off"]);

const isTTY = process.stdout.isTTY;

function colorize(text, color) {
  if (!isTTY) return text;
  const code = COLOR[color];
  if (!code) return text;
  return `${code}${text}${COLOR.reset}`;
}

function boolFrom(value, fallback) {
  if (value == null) return fallback;
  const normalised = String(value).trim().toLowerCase();
  if (TRUE_STRINGS.has(normalised)) return true;
  if (FALSE_STRINGS.has(normalised)) return false;
  return fallback;
}

function parsePortTokens(tokens) {
  const ports = [];
  for (const token of tokens) {
    if (!token) continue;
    for (const piece of String(token).split(/[\s,]+/)) {
      const trimmed = piece.trim();
      if (!trimmed) continue;
      const value = Number(trimmed);
      if (Number.isInteger(value) && value > 0 && value <= 65535) {
        ports.push(value);
      }
    }
  }
  return ports;
}

function unique(numbers) {
  return [...new Set(numbers)];
}

function printHelp() {
  const header = colorize("Scheduler • Port Health", "bold");
  console.log(`${header}\n`);
  console.log("Usage: node scripts/check-ports.mjs [options] [ports...]");
  console.log("Options:");
  console.log("  --silent, -s          Suppress human output");
  console.log("  --json                 Emit JSON summary (or CHECK_PORTS_JSON=1)");
  console.log("  --host <addr>          Host to probe (default 127.0.0.1)");
  console.log("  --timeout <ms>         Fail after <ms> while probing (default 2000)");
  console.log("  --no-suggest           Skip remediation hints");
  console.log("  --label <text>         Include a label in the summary (e.g. 'dev:web')");
  console.log("  --verbose              Print extra diagnostics");
  console.log("  --help, -h             Show this help message");
  console.log("\nExamples:");
  console.log("  node scripts/check-ports.mjs 3000 8080");
  console.log("  node scripts/check-ports.mjs --json 3000,8080");
  console.log("  CHECK_PORTS_JSON=1 node scripts/check-ports.mjs 3000");
}

function parseArgs(argv) {
  const opts = {
    silent: boolFrom(process.env.CHECK_PORTS_SILENT, false),
    json: boolFrom(process.env.CHECK_PORTS_JSON, false),
    verbose: boolFrom(process.env.CHECK_PORTS_VERBOSE, false),
    host: process.env.CHECK_PORTS_HOST || DEFAULT_HOST,
    timeout: Number(process.env.CHECK_PORTS_TIMEOUT) || DEFAULT_TIMEOUT_MS,
    suggest: boolFrom(process.env.CHECK_PORTS_SUGGEST, true),
    label: process.env.CHECK_PORTS_LABEL || null,
    ports: parsePortTokens(
      process.env.CHECK_PORTS_DEFAULT ? [process.env.CHECK_PORTS_DEFAULT] : []
    ),
  };

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === "--") {
      opts.ports.push(...parsePortTokens(args.slice(i + 1)));
      break;
    }

    if (arg === "--help" || arg === "-h") {
      opts.help = true;
      continue;
    }

    if (arg === "--silent" || arg === "-s") {
      opts.silent = true;
      continue;
    }

    if (arg === "--json") {
      opts.json = true;
      continue;
    }

    if (arg === "--verbose") {
      opts.verbose = true;
      continue;
    }

    if (arg === "--no-suggest") {
      opts.suggest = false;
      continue;
    }

    if (arg.startsWith("--host")) {
      const next = arg.includes("=") ? arg.split("=")[1] : args[++i];
      if (next) opts.host = next;
      continue;
    }

    if (arg.startsWith("--timeout")) {
      const next = arg.includes("=") ? arg.split("=")[1] : args[++i];
      if (next) {
        const parsed = Number(next);
        if (Number.isFinite(parsed) && parsed > 0) opts.timeout = parsed;
      }
      continue;
    }

    if (arg.startsWith("--label")) {
      const next = arg.includes("=") ? arg.split("=")[1] : args[++i];
      if (next) opts.label = next;
      continue;
    }

    // fall back to treating argument as a port token (supports comma lists)
    opts.ports.push(...parsePortTokens([arg]));
  }

  return opts;
}

async function probePort(port, host, timeoutMs) {
  const started = performance.now();

  return new Promise((resolve) => {
    let settled = false;

    const settle = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        port,
        host,
        free: result.free,
        reason: result.reason,
        error: result.error,
        duration: Number((performance.now() - started).toFixed(1)),
      });
    };

    const timer = setTimeout(() => {
      settle({ free: false, reason: "timeout" });
    }, timeoutMs);

    const server = net
      .createServer()
      .once("error", (err) => {
        const code = /** @type {{ code?: string }} */ (err).code;
        const reason = code === "EADDRINUSE" ? "in-use" : code || "error";
        settle({ free: false, reason, error: err });
      })
      .once("listening", () => {
        server.close(() => settle({ free: true, reason: "free" }));
      })
      .listen(port, host);
  });
}

function renderHumanSummary(options, results) {
  if (options.silent || options.json) return;

  const labelSuffix = options.label ? colorize(` (${options.label})`, "dim") : "";
  console.log(colorize(`┏━━━━━━━━━━━━━━━━━━━━━━━ PORT HEALTH${labelSuffix}`, "cyan"));
  console.log(colorize(`┃ Host: ${options.host}`, "gray"));
  console.log(colorize(`┃ Timeout: ${options.timeout}ms`, "gray"));
  console.log(colorize("┡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "gray"));

  const longestPort = Math.max(...results.map((r) => String(r.port).length));
  for (const result of results) {
    const pad = " ".repeat(longestPort - String(result.port).length);
    const status = result.free
      ? colorize("✅ free", "green")
      : colorize("🚫 busy", "red");
    const extra = result.free
      ? colorize(`${result.duration}ms`, "dim")
      : colorize(`${result.reason} • ${result.duration}ms`, "yellow");

    console.log(
      `┃ ${pad}${result.port} → ${status} ${colorize("·", "gray")} ${extra}`,
    );

    if (!result.free && options.verbose && result.error) {
      console.log(
        colorize(`┃    └─ ${result.error.code || "error"}: ${result.error.message}`, "gray"),
      );
    }
  }

  console.log(colorize("└────────────────────────────────────────────", "gray"));
}

function emitJson(options, results) {
  if (!options.json) return;
  const payload = {
    label: options.label,
    host: options.host,
    timeout: options.timeout,
    timestamp: new Date().toISOString(),
    ports: results.map((r) => ({
      port: r.port,
      free: r.free,
      reason: r.reason,
      durationMs: r.duration,
    })),
    busy: results.filter((r) => !r.free).map((r) => r.port),
    free: results.filter((r) => r.free).map((r) => r.port),
  };

  console.log(JSON.stringify(payload, null, 2));
}

function printSuggestion(options, busyPorts) {
  if (options.silent || !options.suggest || busyPorts.length === 0) return;
  const killCommand = `pnpm dlx kill-port ${busyPorts.join(" ")}`;
  console.log(
    colorize(
      `💡 Tip: Free them quickly with → ${colorize(killCommand, "bold")}`,
      "yellow",
    ),
  );
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!options.ports.length) {
    options.ports = [...DEFAULT_PORTS];
  }

  options.ports = unique(options.ports);

  if (!options.ports.length) {
    console.error("No ports specified. Provide ports via CLI or CHECK_PORTS_DEFAULT.");
    process.exit(2);
  }

  const results = [];
  for (const port of options.ports) {
    const outcome = await probePort(port, options.host, options.timeout);
    results.push(outcome);
  }

  renderHumanSummary(options, results);
  emitJson(options, results);

  const busyPorts = results.filter((r) => !r.free).map((r) => r.port);
  if (busyPorts.length) {
    printSuggestion(options, busyPorts);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("check-ports failed:", error?.stack || error?.message || error);
  process.exit(1);
});
