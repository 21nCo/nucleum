import { devices, defineConfig } from "@playwright/test";
import path from "node:path";

import "dotenv/config";

const artifactsDir = path.join(__dirname, "artifacts");

const defaultBaseURL = process.env.APP_BASE_URL ?? "http://127.0.0.1:4173";

function getProjectBaseURL(projectName: string): string {
  const envKey = `APP_BASE_URL_${projectName.toUpperCase()}`;
  return (process.env[envKey] ?? process.env.APP_BASE_URL) ?? defaultBaseURL;
}

function getProjectUse(projectName: string) {
  const baseURL = getProjectBaseURL(projectName);
  return {
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 720 },
    video: "on" as const,
    trace: "on-first-retry" as const,
    screenshot: "only-on-failure" as const,
    baseURL
  };
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
    screenshot: "only-on-failure"
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
