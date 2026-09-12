import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    testTimeout: 20000, // mongodb-memory-server's first binary download/boot can be slow
    hookTimeout: 30000,
  },
});
