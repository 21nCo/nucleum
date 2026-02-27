import { devices, defineConfig } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

// Load .env so E2E_*, APP_BASE_URL are available
import "dotenv/config";

const artifactsDir = path.join(__dirname, "artifacts");
const authStatePath = path.resolve(__dirname, ".auth", "user.json");
const useGoogleAuthState = fs.existsSync(authStatePath);

let baseURL = process.env.APP_BASE_URL ?? "http://127.0.0.1:4173";

// If we have saved auth but baseURL origin doesn't match, use the saved origin so the session is applied
// (localStorage is per-origin; mismatch causes "Embed token: false" and login screen).
if (useGoogleAuthState) {
  try {
    const raw = fs.readFileSync(authStatePath, "utf-8");
    const state = JSON.parse(raw) as { origins?: Array<{ origin: string }> };
    const savedOrigins = state.origins?.map((o) => o.origin) ?? [];
    const currentOrigin = new URL(baseURL).origin;
    if (savedOrigins.length > 0 && !savedOrigins.includes(currentOrigin)) {
      baseURL = savedOrigins[0];
      process.env.APP_BASE_URL = baseURL;
    }
  } catch {
    // ignore
  }
}

const sharedUse = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1280, height: 720 },
  video: "on" as const,
  trace: "on-first-retry" as const,
  screenshot: "only-on-failure" as const,
  ...(useGoogleAuthState ? { storageState: authStatePath } : {})
};

export default defineConfig({
  testDir: path.join(__dirname, "tests"),
  globalSetup: path.join(__dirname, "global-setup.ts"),
  globalTeardown: path.join(__dirname, "global-teardown.ts"),
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: true,
  reporter: process.env.CI
    ? [
        ["junit", { outputFile: path.join(artifactsDir, "junit.xml") }],
        [
          "html",
          {
            open: "never",
            outputFolder: path.join(artifactsDir, "html-report")
          }
        ]
      ]
    : [
        ["list"],
        [
          "html",
          {
            open: "never",
            outputFolder: path.join(artifactsDir, "html-report")
          }
        ]
      ],
  use: {
    baseURL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "nucleus",
      testMatch: [
        "**/shared/**/*.spec.ts",
        "**/nucleus/**/*.spec.ts",
        "**/core/**/*.spec.ts"
      ],
      retries: 1,
      workers: 1,
      use: { ...sharedUse, baseURL }
    },
    {
      name: "pointron",
      testMatch: [
        "**/shared/**/*.spec.ts",
        "**/pointron/**/*.spec.ts",
        "**/core/focus/**/*.spec.ts"
      ],
      retries: 1,
      workers: 1,
      use: { ...sharedUse, baseURL }
    },
    {
      name: "memotron",
      testMatch: [
        "**/shared/**/*.spec.ts",
        "**/memotron/**/*.spec.ts",
        "**/core/memory/**/*.spec.ts"
      ],
      retries: 1,
      workers: 1,
      use: { ...sharedUse, baseURL }
    }
  ]
});
