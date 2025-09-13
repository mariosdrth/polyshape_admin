import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    globals: true,
    setupFiles: "./setupTests.ts",
    coverage: {
      reporter: ["text", "html"],
      reportsDirectory: "./coverage"
    }
  }
});
