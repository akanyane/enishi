import { defineConfig, devices } from "@playwright/test";

const API_PORT = 5099;
const WEB_PORT = 5199;
const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: "pt-BR",
    // Animations off: faster, and no element moves while being clicked.
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      name: "api",
      command: "tsx start-api.ts",
      url: `http://localhost:${API_PORT}/api/users/current`, // answers 401 once the server is up
      env: { PORT: String(API_PORT) },
      // The first run downloads the mongod binary.
      timeout: 180_000,
      reuseExistingServer: !CI,
      gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
    },
    {
      name: "web",
      command: `pnpm --filter @enishi/web exec vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { API_PORT: String(API_PORT) },
      reuseExistingServer: !CI,
    },
  ],
});
