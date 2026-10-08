import { defineConfig, devices } from "@playwright/test";

// BASE_URL targets a deployed environment (preprod); without it, the suite
// starts the production build locally.
const baseURL = process.env.BASE_URL ?? "http://localhost:3100";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
    httpCredentials:
      process.env.PREPROD_USER && process.env.PREPROD_PASSWORD
        ? { username: process.env.PREPROD_USER, password: process.env.PREPROD_PASSWORD }
        : undefined,
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run start -- -p 3100",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
