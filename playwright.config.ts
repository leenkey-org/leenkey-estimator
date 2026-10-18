import { defineConfig, devices } from "@playwright/test";

// BASE_URL targets a deployed environment (preprod); without it, the suite
// starts the production build locally.
const baseURL = process.env.BASE_URL ?? "http://localhost:3100";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

// Specs that change the seed for good (a decision of the back office does not
// go back): in their own project, after the two others, so that no spec reads
// the seed while they change it. They also need E2E_MUTATE=1 and a local
// stack (see each file). `--no-deps` runs one of them alone.
const MUTATING = /(admin-listings|property-creation|property-photos)\.spec\.ts$/;
const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } };

// Cookie consent already answered (refused) so that the banner of L1-37
// never covers what a test clicks; tests/e2e/consent.spec.ts starts without it.
const consentRefused = {
  cookies: [
    {
      name: "lk_consent",
      value: `v1.0.${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date())}`,
      domain: new URL(baseURL).hostname,
      path: "/",
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    },
  ],
  origins: [],
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    storageState: consentRefused,
    trace: "retain-on-failure",
    httpCredentials:
      process.env.PREPROD_USER && process.env.PREPROD_PASSWORD
        ? { username: process.env.PREPROD_USER, password: process.env.PREPROD_PASSWORD }
        : undefined,
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    {
      name: "mobile",
      testIgnore: MUTATING,
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
    { name: "desktop", testIgnore: MUTATING, use: desktop },
    {
      name: "seed-mutations",
      testMatch: MUTATING,
      dependencies: ["mobile", "desktop"],
      use: desktop,
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
