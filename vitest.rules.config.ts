import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/rules-setup.ts"],
    include: ["src/test/**/firestore*.test.ts"],
    exclude: ["node_modules", "dist", ".next"],
    testTimeout: 60000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
