import { devices, defineConfig } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

// Load .env so E2E_*, APP_BASE_URL, APP_BASE_URL_* are available
import "dotenv/config";

const artifactsDir = path.join(__dirname, "artifacts");
const authDir = path.resolve(__dirname, ".auth");

const defaultBaseURL = process.env.APP_BASE_URL ?? "http://127.0.0.1:4173";

function getProjectBaseURL(projectName: string): string {
  const envKey = `APP_BASE_URL_${projectName.toUpperCase()}`;
  return (process.env[envKey] ?? process.env.APP_BASE_URL) ?? defaultBaseURL;
}

function getAuthPath(projectName: string): string {
  const file = projectName === "nucleus" ? "user.json" : `user-${projectName}.json`;
  return path.join(authDir, file);
}

function resolveBaseURLWithAuth(projectName: string): string {
  const envKey = `APP_BASE_URL_${projectName.toUpperCase()}`;
  const explicitEnvURL = process.env[envKey] ?? process.env.APP_BASE_URL;
  let baseURL = getProjectBaseURL(projectName);
  const authPath = getAuthPath(projectName);
  if (!fs.existsSync(authPath)) return baseURL;
  try {
    const raw = fs.readFileSync(authPath, "utf-8");
    const state = JSON.parse(raw) as { origins?: Array<{ origin: string }> };
    const savedOrigins = state.origins?.map((o) => o.origin) ?? [];
    const currentOrigin = new URL(baseURL).origin;
    if (savedOrigins.length > 0 && !savedOrigins.includes(currentOrigin)) {
      if (!explicitEnvURL) {
        baseURL = savedOrigins[0];
      } else {
        console.warn(
          `[e2e] ${projectName}: saved auth origins (${savedOrigins.join(", ")}) do not match configured baseURL (${baseURL}). Re-run e2e:save-auth:${projectName} or update ${envKey}.`
        );
      }
    }
  } catch {
  }
  return baseURL;
}

function getProjectUse(projectName: string) {
  const baseURL = resolveBaseURLWithAuth(projectName);
  const authPath = getAuthPath(projectName);
  const useAuth = fs.existsSync(authPath);
  return {
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 720 },
    video: "on" as const,
    trace: "on-first-retry" as const,
    screenshot: "only-on-failure" as const,
    baseURL,
    ...(useAuth ? { storageState: authPath } : {})
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
      name: "nucleus",
      testMatch: [
        "tests/smoke/**/*.spec.ts",
        "tests/shared/**/*.spec.ts",
        "tests/nucleus/**/*.spec.ts"
      ],
      retries: 1,
      workers: 1,
      use: getProjectUse("nucleus")
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
