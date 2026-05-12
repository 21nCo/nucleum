import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { captureConsole, timestamp } from "./runtime";

const artifactDir = path.join(
  __dirname,
  "..",
  "artifacts",
  "authfn-settings-logout",
  timestamp()
);
const appBaseUrl =
  process.env.AUTHFN_LOGOUT_PROBE_APP_URL ?? "https://local.nucleum.app";
const accountBaseUrl =
  process.env.AUTHFN_LOGOUT_PROBE_ACCOUNT_URL ??
  "https://account-insouth-local.nucleum.app";
const email = `codex-authfn-settings-logout-${Date.now()}@example.test`;
const password = "ProbePass12!";

const result: Record<string, unknown> = {
  appBaseUrl,
  accountBaseUrl,
  email,
  steps: {},
  authResponses: [],
  browserConsole: [],
  pageErrors: [],
  requestFailures: []
};

async function main() {
  await fs.mkdir(artifactDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();
  pageForFailure = page;

  page.on("console", async (message) => {
    (result.browserConsole as unknown[]).push(await captureConsole(message));
  });
  page.on("pageerror", (error) => {
    (result.pageErrors as string[]).push(error.stack ?? error.message);
  });
  page.on("requestfailed", (request) => {
    (result.requestFailures as unknown[]).push({
      url: request.url(),
      errorText: request.failure()?.errorText ?? "unknown"
    });
  });
  page.on("response", (response) => {
    if (response.url().includes("/auth/")) {
      (result.authResponses as unknown[]).push({
        url: response.url(),
        status: response.status(),
        ok: response.ok()
      });
    }
  });

  try {
    await signUp(page);
    await openAccountSettings(page);
    await signOutFromAccountSettings(page);
  } finally {
    await page.screenshot({
      path: path.join(artifactDir, "final.png"),
      fullPage: true
    }).catch(() => undefined);
    await fs.writeFile(path.join(artifactDir, "final.html"), await page.content());
    await fs.writeFile(
      path.join(artifactDir, "result.json"),
      JSON.stringify(result, null, 2)
    );
    await browser.close();
    console.log(`AuthFn settings logout probe artifacts: ${artifactDir}`);
  }
}

async function signUp(page: Page) {
  await recordStep("sign-up", async () => {
    await page.goto(`${appBaseUrl}/account/login`, {
      waitUntil: "domcontentloaded"
    });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await fillEmail(page, email);
    await page.getByRole("button", { name: /Create password/i }).click();
    await page.locator('input[type="password"]').fill(password);
    const signUpResponse = await waitForAuthResponse(
      page,
      "/auth/sign-up/password",
      () => page.getByRole("button", { name: /Sign up with email/i }).click()
    );
    await page.waitForFunction(
      () => Boolean(window.localStorage.getItem("authfnToken")),
      undefined,
      { timeout: 15_000 }
    );
    const tokenPresent = await hasAuthFnToken(page);
    return {
      status: signUpResponse.status(),
      tokenPresent,
      location: page.url()
    };
  });
}

async function openAccountSettings(page: Page) {
  await recordStep("open-account-settings", async () => {
    await page.getByTestId("topnav-account-settings").click({ timeout: 15_000 });
    await page.getByTestId("settings-sidebar").waitFor({
      state: "visible",
      timeout: 15_000
    });
    await page.screenshot({
      path: path.join(artifactDir, "settings-open.png"),
      fullPage: true
    });
    await page
      .getByTestId("settings-sidebar")
      .getByText(email, { exact: false })
      .click({ timeout: 15_000 });
    await page.getByText("Account Details").waitFor({
      state: "visible",
      timeout: 15_000
    });
    const signOutButtons = await page
      .locator('button:has-text("Sign out"), [data-testid$="sign-out"]')
      .evaluateAll((buttons) =>
        buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            text: button.textContent?.trim(),
            visible:
              rect.width > 0 &&
              rect.height > 0 &&
              getComputedStyle(button).visibility !== "hidden" &&
              getComputedStyle(button).display !== "none",
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          };
        })
      );
    await page.screenshot({
      path: path.join(artifactDir, "account-settings.png"),
      fullPage: true
    });
    return {
      signOutButtons
    };
  });
}

async function signOutFromAccountSettings(page: Page) {
  await recordStep("sign-out", async () => {
    const signOutButton = page.getByTestId("account-settings-sign-out");
    await signOutButton.scrollIntoViewIfNeeded();
    const signOutResponsePromise = page
      .waitForResponse((response) => response.url().includes("/auth/sign-out"), {
        timeout: 20_000
      })
      .catch((error) => error);
    await signOutButton.click({ timeout: 15_000 });
    const signOutResponse = await signOutResponsePromise;
    await page.waitForFunction(
      () => !window.localStorage.getItem("authfnToken"),
      undefined,
      { timeout: 20_000 }
    );
    const tokenPresent = await hasAuthFnToken(page);
    const session = await page.evaluate(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/auth/session`, {
        credentials: "include"
      });
      return response.json();
    }, accountBaseUrl);
    return {
      signOutStatus:
        signOutResponse instanceof Error ? signOutResponse.message : signOutResponse.status(),
      tokenPresent,
      sessionOk: session.ok,
      sessionData: session.data ?? null,
      currentUrl: page.url()
    };
  });
}

async function fillEmail(page: Page, value: string) {
  const input = page
    .getByPlaceholder(/username@email\.com|name@email\.com/i)
    .first();
  await input.waitFor({ state: "visible", timeout: 20_000 });
  await input.fill(value);
}

async function waitForAuthResponse(
  page: Page,
  pathPart: string,
  action: () => Promise<unknown>
) {
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(pathPart),
    { timeout: 20_000 }
  );
  await action();
  const response = await responsePromise;
  if (!response.ok()) {
    throw new Error(`${pathPart} returned ${response.status()}: ${await response.text()}`);
  }
  return response;
}

async function hasAuthFnToken(page: Page) {
  return page.evaluate(() => Boolean(window.localStorage.getItem("authfnToken")));
}

async function recordStep(
  name: string,
  action: () => Promise<Record<string, unknown>>
) {
  try {
    const details = await action();
    (result.steps as Record<string, unknown>)[name] = { ok: true, details };
  } catch (error) {
    (result.steps as Record<string, unknown>)[name] = {
      ok: false,
      error: error instanceof Error ? error.stack ?? error.message : String(error)
    };
    await fs.writeFile(
      path.join(artifactDir, `${name}-failure.html`),
      await actionPageContent().catch(() => "")
    );
    throw error;
  }
}

let pageForFailure: Page | null = null;
async function actionPageContent() {
  return pageForFailure ? pageForFailure.content() : "";
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
