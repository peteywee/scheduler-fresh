#!/usr/bin/env node
import net from "node:net";
import process from "node:process";

const DEFAULT_PORTS = [3000, 8080, 9099, 9199];
const argv = process.argv.slice(2);

if (process.env.CHECK_PORTS_DEBUG === "1") {
  console.log(`[check-ports] argv=${JSON.stringify(argv)}`);
}

const options = {
  json: process.env.CHECK_PORTS_JSON === "1" || false,
  silent: false,
};

const positional = [];

for (const arg of argv) {
  const trimmedArg = arg.trim();

  if (trimmedArg === "--") {
    continue;
  } else if (trimmedArg === "--json") {
    options.json = true;
  } else if (trimmedArg === "--silent") {
    options.silent = true;
  } else if (trimmedArg.startsWith("--ports=")) {
    const parts = trimmedArg.split("=");
    if (parts.length > 1 && parts[1]) {
      positional.push(...parts[1].split(","));
    } else {
      console.warn(`Flag '${trimmedArg}' is missing a value after '=' and was ignored.`);
    }
  } else if (trimmedArg.startsWith("--")) {
    console.warn(`Unknown flag '${trimmedArg}' ignored.`);
  } else {
    positional.push(trimmedArg);
  }
}

const explicitPorts = positional
  .map((value) => Number.parseInt(value, 10))
  .filter((value) => Number.isFinite(value) && value > 0 && value <= 65535);

const targetPorts = explicitPorts.length > 0 ? explicitPorts : DEFAULT_PORTS;

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", (err) => {
      if ("code" in err && err.code === "EADDRINUSE") {
        resolve({ port, free: false, error: null });
      } else {
        resolve({ port, free: false, error: err });
      }
    });
    server.listen({ port, host: "127.0.0.1" }, () => {
      server.close(() => resolve({ port, free: true, error: null }));
    });
  });
}

async function main() {
  const results = await Promise.all(targetPorts.map((port) => checkPort(port)));
  const busy = results.filter((result) => !result.free);

  if (options.json) {
    const payload = {
      ports: results.map(({ port, free, error }) => ({
        port,
        free,
        errorCode: error?.code ?? null,
      })),
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(payload, null, 2));
  } else if (!options.silent) {
    busy.forEach(({ port, error }) => {
      if (error && error.code && error.code !== "EADDRINUSE") {
        console.warn(`⚠️ Port ${port} could not be checked (${error.code}).`);
      } else {
        console.error(`❌ Port ${port} is busy.`);
      }
    });
  }

  if (busy.length > 0) {
    if (!options.silent && !options.json) {
      const busyList = busy.map(({ port }) => port).join(", ");
      console.error(`\nSome ports are in use: ${busyList}`);
      console.error("Try 'pnpm run kill:ports' or stop the conflicting process manually.");
    }
    process.exitCode = 2;
    return;
  }

  process.exitCode = 0;
}

main().catch((error) => {
  console.error("Unexpected error while checking ports:", error);
  process.exit(1);
});
