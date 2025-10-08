import { beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";

// Load environment variables for testing (use createRequire to avoid Vite static import resolution)
const require = createRequire(import.meta.url);
let dotenv: unknown = null;
try {
  dotenv = require("dotenv");
  (dotenv as any).config({ path: ".env.example" });
} catch (e) {
  // Not fatal: some environments (CI or nested workspaces) may not have dotenv at repo root.
  // Tests will continue with environment variables provided by the caller.
  // eslint-disable-next-line no-console
  console.warn("dotenv not available at repo root - skipping .env load");
  console.warn("Failed to load dotenv or .env.example file - continuing without environment file");

// Set test environment variables
Object.assign(process.env, {
  NODE_ENV: "test",
  NEXT_PHASE: "test",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-test-project",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
});

beforeAll(async () => {
  // Any global test setup can go here
});

afterAll(async () => {
  // Any global test cleanup can go here
});
