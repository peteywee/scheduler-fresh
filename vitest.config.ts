import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/__tests__/**/*.test.ts",
    ],
    setupFiles: ["src/__tests__/setup.ts"], // create if you need global test setup
    testTimeout: 30000, // firestore rules/emulator tests can be slower
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});