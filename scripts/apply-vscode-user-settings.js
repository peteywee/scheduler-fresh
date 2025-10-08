#!/usr/bin/env node
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

const desiredSettings = {
  "typescript.tsserver.maxTsServerMemory": 4096,
  "typescript.disableAutomaticTypeAcquisition": true,
  "typescript.tsserver.useSeparateSyntaxServer": true,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "javascript.suggest.autoImports": false,
  "typescript.suggest.autoImports": false,
  "search.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true,
    "**/build": true,
    "**/coverage": true,
  },
  "files.watcherExclude": {
    "**/.git/**": true,
    "**/node_modules/**": true,
    "**/.next/**": true,
    "**/dist/**": true,
    "**/build/**": true,
    "**/coverage/**": true,
  },
  "editor.formatOnType": false,
  "editor.codeActionsOnSave": {
    "source.organizeImports": "never",
    "source.fixAll.eslint": "explicit",
  },
  "terminal.integrated.env.linux": {
    NODE_OPTIONS: "--max-old-space-size=4096",
  },
};

function deepMerge(target, source) {
  if (typeof target !== "object" || target === null) return source;
  if (typeof source !== "object" || source === null) return source;
  const out = Array.isArray(target) ? target.slice() : { ...target };
  for (const key of Object.keys(source)) {
    if (key in out) {
      out[key] = deepMerge(out[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch (e) {
    return false;
  }
}

async function run() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run") || argv.includes("-n");
  const targetArgIndex = argv.findIndex((a) => a === "--target" || a === "-t");
  const targetOverride =
    targetArgIndex !== -1 && argv[targetArgIndex + 1]
      ? argv[targetArgIndex + 1]
      : null;

  const home = process.env.HOME || os.homedir();
  const candidates = [
    path.join(home, ".config/Code/User/settings.json"),
    path.join(home, ".config/Code - OSS/User/settings.json"),
    path.join(home, ".config/VSCodium/User/settings.json"),
    path.join(home, ".config/Code\ -\ OSS/User/settings.json"),
  ];

  let targetPath = targetOverride || candidates.find((p) => false);
  // We can't probe the user's FS from inside this repo; prefer the standard path unless overridden.
  if (!targetPath)
    targetPath = path.join(home, ".config/Code/User/settings.json");

  console.log("Target user settings path:", targetPath);

  const dir = path.dirname(targetPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  let existing = {};
  if (await fileExists(targetPath)) {
    try {
      const raw = await fs.readFile(targetPath, "utf8");
      existing = JSON.parse(raw || "{}");
    } catch (err) {
      console.error(
        "Failed to parse existing settings.json — aborting to avoid data loss.",
      );
      console.error(err.message);
      process.exit(2);
    }
  } else {
    console.log(
      "No existing user settings.json found at target path — a new file will be created.",
    );
  }

  const merged = deepMerge(existing, desiredSettings);

  console.log("\nMerged settings (preview):\n");
  console.log(JSON.stringify(merged, null, 2));

  if (dryRun) {
    console.log(
      "\nDry-run mode — no files changed. To apply the changes, run without --dry-run.",
    );
    return;
  }

  // Create directory if needed
  await fs.mkdir(dir, { recursive: true });

  if (await fileExists(targetPath)) {
    const backupPath = `${targetPath}.bak.${timestamp}`;
    await fs.copyFile(targetPath, backupPath);
    console.log("Backed up existing settings to", backupPath);
  }

  await fs.writeFile(
    targetPath,
    JSON.stringify(merged, null, 2) + "\n",
    "utf8",
  );
  console.log("Wrote merged settings to", targetPath);
  console.log("\nDone. Restart VS Code if it is running to pick up changes.");
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
