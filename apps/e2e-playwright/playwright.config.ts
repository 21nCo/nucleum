import { devices, defineConfig } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

// Load .env so E2E_*, APP_BASE_URL are available
import "dotenv/config";

const artifactsDir = path.join(__dirname, "artifacts");
const authStatePath = path.join(__dirname, ".auth", "user.json");
const useGoogleAuthState = fs.existsSync(authStatePath);

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
    ? [["junit", { outputFile: path.join(artifactsDir, "junit.xml") }], ["html", { open: "never", outputFolder: path.join(artifactsDir, "html-report") }]]
    : [["list"], ["html", { open: "never", outputFolder: path.join(artifactsDir, "html-report") }]],
  use: {
    baseURL: process.env.APP_BASE_URL ?? "http://127.0.0.1:4173",
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "smoke",
      testDir: path.join(__dirname, "tests", "smoke"),
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: "regression",
      testDir: path.join(__dirname, "tests", "regression"),
      retries: 1,
      workers: 1,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        video: "on", // keep video for every run (pass or fail)
        ...(useGoogleAuthState ? { storageState: authStatePath } : {})
      }
    }
  ]
});
