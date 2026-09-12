import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    testTimeout: 20000, // mongodb-memory-server's first binary download/boot can be slow
    hookTimeout: 30000,
  },
});
