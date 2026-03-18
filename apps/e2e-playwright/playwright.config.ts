import { devices, defineConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import "dotenv/config";

const artifactsDir = path.join(__dirname, "artifacts");
const authDir = path.join(__dirname, ".auth");

const defaultBaseURL = process.env.APP_BASE_URL ?? "http://127.0.0.1:4173";

function getProjectBaseURL(projectName: string): string {
  // Project "nucleum" can use APP_BASE_URL_NUCLEUM or APP_BASE_URL_NUCLEUS
  if (projectName === "nucleum") {
    return (
      process.env.APP_BASE_URL_NUCLEUM ??
      process.env.APP_BASE_URL_NUCLEUS ??
      process.env.APP_BASE_URL ??
      defaultBaseURL
    );
  }
  const envKey = `APP_BASE_URL_${projectName.toUpperCase()}`;
  return (process.env[envKey] ?? process.env.APP_BASE_URL) ?? defaultBaseURL;
}

function getAuthFilePath(projectName: string): string {
  const fileName = projectName === "nucleum" ? "user.json" : `user-${projectName}.json`;
  return path.join(authDir, fileName);
}

function getProjectUse(projectName: string) {
  const baseURL = getProjectBaseURL(projectName);
  const authPath = getAuthFilePath(projectName);
  const use = {
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 720 },
    video: "on" as const,
    trace: "on-first-retry" as const,
    screenshot: "only-on-failure" as const,
    // Local dev uses Caddy `tls internal`; Playwright's bundled Chromium may not honor OS trust store.
    // Keeping this avoids CI/local flakes while still testing app behavior over HTTPS.
    ignoreHTTPSErrors: true,
    baseURL
  };
  if (fs.existsSync(authPath)) {
    (use as { storageState?: string }).storageState = authPath;
  }
  return use;
}

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
    baseURL: defaultBaseURL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    // Local dev uses Caddy `tls internal`; Playwright's bundled Chromium may not honor OS trust store.
    // Keeping this avoids CI/local flakes while still testing app behavior over HTTPS.
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: "nucleum",
      testMatch: [
        "tests/smoke/**/*.spec.ts",
        "tests/shared/**/*.spec.ts",
        "tests/nucleum/**/*.spec.ts"
      ],
      retries: 1,
      workers: 1,
      use: getProjectUse("nucleum")
    },
    {
      name: "pointron",
      testMatch: [
        "tests/shared/**/*.spec.ts",
        "tests/pointron/**/*.spec.ts"
      ],
      testIgnore: ["**/shared/memory/**"],
      retries: 1,
      workers: 1,
      use: getProjectUse("pointron")
    },
    {
      name: "memotron",
      testMatch: [
        "tests/shared/**/*.spec.ts",
        "tests/memotron/**/*.spec.ts"
      ],
      testIgnore: ["**/shared/focus/**"],
      retries: 1,
      workers: 1,
      use: getProjectUse("memotron")
    }
  ]
});
