import fs from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { captureConsole, timestamp } from "./runtime";

import "dotenv/config";

interface ProbeProcess {
  name: string;
  process: ChildProcess;
  output: string[];
  close(): Promise<void>;
}

interface StepResult {
  ok: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

interface ProbeResult {
  runId: string;
  appBaseUrl: string;
  accountBaseUrl: string;
  steps: Record<string, StepResult>;
  authResponses: Array<{ url: string; method: string; status: number; ok: boolean }>;
  browserConsole: Array<{ type: string; text: string; args?: unknown[] }>;
  pageErrors: string[];
  requestFailures: Array<{ url: string; errorText: string }>;
  serverOutput: Record<string, string[]>;
}

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const runId = timestamp();
const artifactDir = path.join(
  __dirname,
  "..",
  "artifacts",
  "authfn-account-flow",
  runId
);
const appPort = Number(process.env.AUTHFN_PROBE_APP_PORT ?? 5055);
const accountPort = Number(process.env.AUTHFN_PROBE_ACCOUNT_PORT ?? 18810);
const appBaseUrl = `http://127.0.0.1:${appPort}`;
const accountBaseUrl = `http://127.0.0.1:${accountPort}`;
const email = `frontend-authfn-${Date.now()}@example.test`;
const otpOnlyEmail = `frontend-authfn-otp-only-${Date.now()}@example.test`;
const password = "ProbePass12!";
const newPassword = "ProbeReset1!";
const linkedPassword = "ProbeLinked1!";

const result: ProbeResult = {
  runId,
  appBaseUrl,
  accountBaseUrl,
  steps: {},
  authResponses: [],
  browserConsole: [],
  pageErrors: [],
  requestFailures: [],
  serverOutput: {}
};

async function main() {
  await fs.mkdir(artifactDir, { recursive: true });
  const processes: ProbeProcess[] = [];

  try {
    processes.push(await startAccountService());
    processes.push(await startNucleusApp());
    await runBrowserProbe();
  } catch (error) {
    result.steps.probe = {
      ok: false,
      error: error instanceof Error ? error.stack ?? error.message : String(error)
    };
    process.exitCode = 1;
  } finally {
    for (const proc of processes.reverse()) {
      await proc.close().catch(() => undefined);
      result.serverOutput[proc.name] = proc.output.slice(-200);
    }
    await fs.writeFile(
      path.join(artifactDir, "result.json"),
      JSON.stringify(result, null, 2)
    );
    console.log(`AuthFn account probe artifacts: ${artifactDir}`);
  }
}

async function startAccountService(): Promise<ProbeProcess> {
  return startProcess({
    name: "account-memory",
    command: "npm",
    args: ["--prefix", "services/account", "run", "dev:memory"],
    cwd: repoRoot,
    env: {
      ACCOUNT_MEMORY_PORT: String(accountPort),
      ACCOUNT_MEMORY_HOST: "127.0.0.1",
      ACCOUNT_MEMORY_AUTHORITY: accountBaseUrl,
      ACCOUNT_REGION_ID: "useast",
      ACCOUNT_CORS_ORIGINS: appBaseUrl
    },
    ready: (output) => output.includes("Nucleus account memory service listening")
  });
}

async function startNucleusApp(): Promise<ProbeProcess> {
  return startProcess({
    name: "nucleus-app",
    command: "npm",
    args: [
      "--prefix",
      "apps/nucleus",
      "run",
      "dev",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(appPort),
      "--strictPort",
      "--force"
    ],
    cwd: repoRoot,
    env: {
      VITE_ACCOUNT_BASE_URL: accountBaseUrl,
      VITE_HOST: "127.0.0.1",
      VITE_ISDEBUG: "true",
      VITE_IPINFO_TOKEN: ""
    },
    ready: (output) =>
      output.includes(`http://127.0.0.1:${appPort}`) ||
      output.includes(`ready in`)
  });
}

async function startProcess(input: {
  name: string;
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  ready(output: string): boolean;
}): Promise<ProbeProcess> {
  const output: string[] = [];
  const child = spawn(input.command, input.args, {
    cwd: input.cwd,
    env: {
      ...process.env,
      ...(input.env ?? {})
    },
    stdio: "pipe",
    detached: process.platform !== "win32"
  });

  const proc: ProbeProcess = {
    name: input.name,
    process: child,
    output,
    async close() {
      if (child.exitCode !== null || child.signalCode) return;
      terminateProcessTree(child, "SIGTERM");
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          terminateProcessTree(child, "SIGKILL");
          resolve();
        }, 3_000);
        child.once("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  };

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          `${input.name} did not become ready. Recent output:\n${output.slice(-80).join("")}`
        )
      );
    }, 90_000);

    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      output.push(text);
      process.stdout.write(`[${input.name}] ${text}`);
      if (!settled && input.ready(output.join(""))) {
        settled = true;
        clearTimeout(timeout);
        resolve();
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`${input.name} exited before ready with code ${code}`));
    });
  });

  return proc;
}

async function runBrowserProbe() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  page.on("console", async (message) => {
    result.browserConsole.push(await captureConsole(message));
  });
  page.on("pageerror", (error) => {
    result.pageErrors.push(error.stack ?? error.message);
  });
  page.on("requestfailed", (request) => {
    result.requestFailures.push({
      url: request.url(),
      errorText: request.failure()?.errorText ?? "unknown"
    });
  });
  page.on("response", (response) => {
    if (response.url().includes("/auth/")) {
      result.authResponses.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
        ok: response.ok()
      });
    }
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("region", "useast");
  });

  try {
    await signUpWithPassword(page);
    await clearBrowserAuth(page, context);
    await signInWithPassword(page);
    await clearBrowserAuth(page, context);
    await signInWithOtp(page);
    await clearBrowserAuth(page, context);
    await resetPassword(page);
    await clearBrowserAuth(page, context);
    await signInWithPassword(page, newPassword, "sign-in-reset-password");
    await clearBrowserAuth(page, context);
    await signUpWithOtpOnly(page);
    await setPasswordFromAccountSettings(page);
    await clearBrowserAuth(page, context);
    await signInWithPassword(page, linkedPassword, "sign-in-linked-password", otpOnlyEmail);
    await deleteAccountFromSettings(page);
  } finally {
    await page.screenshot({
      path: path.join(artifactDir, "final.png"),
      fullPage: true
    }).catch(() => undefined);
    await fs.writeFile(
      path.join(artifactDir, "final.html"),
      await page.content().catch(() => "")
    );
    await browser.close();
  }
}

function terminateProcessTree(child: ChildProcess, signal: NodeJS.Signals) {
  if (child.pid && process.platform !== "win32") {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // Process may already be gone; fall back to the direct child.
    }
  }
  child.kill(signal);
}

async function signUpWithPassword(page: Page) {
  await recordStep("sign-up-password", async () => {
    await gotoLogin(page);
    await fillEmail(page, email);
    await page.getByRole("button", { name: /Create password/i }).click();
    await page.locator('input[type="password"]').fill(password);
    const response = await waitForAuthResponse(page, "/auth/sign-up/password", () =>
      page.getByRole("button", { name: /Sign up with email/i }).click()
    );
    const body = await response.json();
    await waitForStoredToken(page);
    const session = await readBrowserSession(page);
    await page.screenshot({
      path: path.join(artifactDir, "sign-up-password.png"),
      fullPage: true
    });
    return {
      status: response.status(),
      ok: body.ok,
      hasStoredToken: true,
      sessionEmail: session.data?.session?.primaryEmail
    };
  });
}

async function signInWithPassword(
  page: Page,
  activePassword = password,
  stepName = "sign-in-password",
  activeEmail = email
) {
  await recordStep(stepName, async () => {
    await gotoLogin(page);
    await page.getByRole("button", { name: /^Log in$/i }).first().click();
    await fillEmail(page, activeEmail);
    await page.getByRole("button", { name: /Enter password/i }).click();
    await page.locator('input[type="password"]').fill(activePassword);
    const response = await waitForAuthResponse(page, "/auth/sign-in/password", () =>
      page.getByRole("button", { name: /^Log in$/i }).last().click()
    );
    const body = await response.json();
    await waitForStoredToken(page);
    const session = await readBrowserSession(page);
    await page.screenshot({
      path: path.join(artifactDir, `${stepName}.png`),
      fullPage: true
    });
    return {
      status: response.status(),
      ok: body.ok,
      sessionEmail: session.data?.session?.primaryEmail
    };
  });
}

async function signUpWithOtpOnly(page: Page) {
  await recordStep("sign-up-otp-only", async () => {
    await gotoLogin(page);
    await fillEmail(page, otpOnlyEmail);
    const sendResponse = await waitForAuthResponse(page, "/auth/otp/send", () =>
      page.getByRole("button", { name: /Send OTP/i }).click()
    );
    const otp = await latestOtp(otpOnlyEmail);
    await page.getByPlaceholder("123456").fill(otp);
    const verifyResponse = await waitForAuthResponse(page, "/auth/otp/verify", () =>
      page.getByRole("button", { name: /Sign up with email/i }).click()
    );
    const body = await verifyResponse.json();
    await waitForStoredToken(page);
    const session = await readBrowserSession(page);
    await page.screenshot({
      path: path.join(artifactDir, "sign-up-otp-only.png"),
      fullPage: true
    });
    return {
      sendStatus: sendResponse.status(),
      verifyStatus: verifyResponse.status(),
      ok: body.ok,
      sessionEmail: session.data?.session?.primaryEmail,
      sessionMethods: session.data?.session?.methods
    };
  });
}

async function setPasswordFromAccountSettings(page: Page) {
  await recordStep("settings-set-password", async () => {
    await openAccountSettings(page, otpOnlyEmail);
    await page.getByText("No password is set for this account.").waitFor({
      state: "visible",
      timeout: 15_000
    });
    await page.getByRole("button", { name: /^Set password$/i }).first().click();
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).waitFor({ state: "visible", timeout: 10_000 });
    await passwordInputs.nth(0).fill(linkedPassword);
    await passwordInputs.nth(1).fill(linkedPassword);
    const linkResponse = await waitForAuthResponse(page, "/auth/sign-up/password", () =>
      page.getByRole("button", { name: /^Set password$/i }).last().click()
    );
    const body = await linkResponse.json();
    await page.getByText("Password sign-in is enabled.").waitFor({
      state: "visible",
      timeout: 15_000
    });
    await page.screenshot({
      path: path.join(artifactDir, "settings-set-password.png"),
      fullPage: true
    });
    return {
      status: linkResponse.status(),
      ok: body.ok,
      stillOnSettings: page.url().includes("setting=account")
    };
  });
}

async function deleteAccountFromSettings(page: Page) {
  await recordStep("settings-delete-account", async () => {
    await openAccountSettings(page, otpOnlyEmail);
    await page.getByRole("button", { name: /^Delete account$/i }).click();
    const confirmationDialog = page.locator("#CONFIRMATION-modal").filter({
      hasText: "Account deletion confirmation"
    });
    await confirmationDialog.waitFor({ state: "visible", timeout: 10_000 });
    const deleteButton = confirmationDialog
      .locator("button")
      .filter({ hasText: "Delete" })
      .first();
    const response = await waitForAuthDeleteAccountResponse(page, () =>
      deleteButton.click()
    );
    const body = await response.json();
    await page.waitForURL(/\/signup\?msg=deleted/, { timeout: 15_000 });
    const session = await readBrowserSession(page);
    const storedToken = await page.evaluate(() =>
      window.localStorage.getItem("authfnToken")
    );
    await page.screenshot({
      path: path.join(artifactDir, "settings-delete-account.png"),
      fullPage: true
    });
    return {
      status: response.status(),
      ok: body.ok,
      deleted: body.data?.deleted,
      sessionAfterDelete: session.data?.session ?? null,
      hasStoredToken: Boolean(storedToken)
    };
  });
}

async function signInWithOtp(page: Page) {
  await recordStep("sign-in-otp", async () => {
    await gotoLogin(page);
    await page.getByRole("button", { name: /^Log in$/i }).first().click();
    await fillEmail(page, email);
    const sendResponse = await waitForAuthResponse(page, "/auth/otp/send", () =>
      page.getByRole("button", { name: /Send OTP/i }).click()
    );
    const otp = await latestOtp(email);
    await page.getByPlaceholder("123456").fill(otp);
    const verifyResponse = await waitForAuthResponse(page, "/auth/otp/verify", () =>
      page.getByRole("button", { name: /^Log in$/i }).last().click()
    );
    const body = await verifyResponse.json();
    await waitForStoredToken(page);
    const session = await readBrowserSession(page);
    await page.screenshot({
      path: path.join(artifactDir, "sign-in-otp.png"),
      fullPage: true
    });
    return {
      sendStatus: sendResponse.status(),
      verifyStatus: verifyResponse.status(),
      ok: body.ok,
      sessionMethods: session.data?.session?.methods
    };
  });
}

async function resetPassword(page: Page) {
  await recordStep("reset-password", async () => {
    await page.goto(`${appBaseUrl}/account/forgot-password`, {
      waitUntil: "domcontentloaded"
    });
    await fillEmail(page, email);
    const startResponse = await waitForAuthResponse(
      page,
      "/auth/password/reset/start",
      () => page.getByRole("button", { name: /^Send OTP$/i }).click()
    );
    const otp = await latestOtp(email);
    await page.getByPlaceholder("123456").fill(otp);
    await page.getByRole("button", { name: /^Continue$/i }).click();
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).waitFor({ state: "visible", timeout: 10_000 });
    await passwordInputs.nth(0).fill(newPassword);
    await passwordInputs.nth(1).fill(newPassword);
    const completeResponse = await waitForAuthResponse(
      page,
      "/auth/password/reset/complete",
      () => page.getByRole("button", { name: /^Reset password$/i }).click()
    );
    const body = await completeResponse.json();
    await page.screenshot({
      path: path.join(artifactDir, "reset-password.png"),
      fullPage: true
    });
    return {
      startStatus: startResponse.status(),
      completeStatus: completeResponse.status(),
      ok: body.ok
    };
  });
}

async function openAccountSettings(page: Page, accountEmail: string) {
  await page.getByTestId("topnav-account-settings").click({ timeout: 15_000 });
  await page.getByTestId("settings-sidebar").waitFor({
    state: "visible",
    timeout: 15_000
  });
  await page
    .getByTestId("settings-sidebar")
    .getByText(accountEmail, { exact: false })
    .click({ timeout: 15_000 });
  await page.getByText("Account Details").waitFor({
    state: "visible",
    timeout: 15_000
  });
}

async function recordStep(
  name: string,
  action: () => Promise<Record<string, unknown>>
) {
  try {
    const details = await action();
    result.steps[name] = { ok: true, details };
  } catch (error) {
    const errorText = error instanceof Error ? error.stack ?? error.message : String(error);
    result.steps[name] = { ok: false, error: errorText };
    await fs.writeFile(
      path.join(artifactDir, `${name}-failure.html`),
      await currentPageHtml().catch(() => "")
    );
    throw error;
  }
}

let activePage: Page | null = null;

async function currentPageHtml() {
  return activePage ? activePage.content() : "";
}

async function gotoLogin(page: Page) {
  activePage = page;
  await page.goto(`${appBaseUrl}/account/login`, {
    waitUntil: "domcontentloaded"
  });
  await page.waitForLoadState("networkidle").catch(() => undefined);
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

async function waitForAuthDeleteAccountResponse(
  page: Page,
  action: () => Promise<unknown>
) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/auth/account") &&
      response.request().method() === "DELETE",
    { timeout: 20_000 }
  );
  await action();
  const response = await responsePromise;
  if (!response.ok()) {
    throw new Error(`/auth/account DELETE returned ${response.status()}: ${await response.text()}`);
  }
  return response;
}

async function waitForStoredToken(page: Page) {
  await page.waitForFunction(
    () => Boolean(window.localStorage.getItem("authfnToken")),
    undefined,
    { timeout: 10_000 }
  );
}

async function readBrowserSession(page: Page) {
  return page.evaluate(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/session`, {
      credentials: "include"
    });
    return response.json();
  }, accountBaseUrl);
}

async function latestOtp(identifier: string): Promise<string> {
  const response = await fetch(
    `${accountBaseUrl}/__test/outbox/latest?identifier=${encodeURIComponent(identifier)}`
  );
  if (!response.ok) {
    throw new Error(`outbox lookup failed: ${response.status()}`);
  }
  const body = await response.json() as { message?: { code?: string } };
  if (!body.message?.code) {
    throw new Error("outbox did not contain an OTP code");
  }
  return body.message.code;
}

async function clearBrowserAuth(
  page: Page,
  context: BrowserContext
) {
  await context.clearCookies();
  await page.goto(appBaseUrl, { waitUntil: "domcontentloaded" }).catch(() => undefined);
  await page.evaluate(() => {
    window.localStorage.removeItem("authfnToken");
    window.localStorage.removeItem("user");
    window.localStorage.removeItem("userInfo");
    window.localStorage.setItem("region", "useast");
  });
}

void main();
