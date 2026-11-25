import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    env: { ACCESS_TOKEN_SECRET: "test-secret", NODE_ENV: "test" },
    // The first run downloads the mongod binary.
    hookTimeout: 120_000,
  },
});
