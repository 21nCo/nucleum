import fs from "node:fs/promises";
import path from "node:path";
import { chromium, webkit, type Page } from "@playwright/test";
import {
  captureConsole,
  ensureInAppOnHome,
  flushAppLogs,
  getNavProductConfig,
  timestamp
} from "./runtime";

const project = "nucleum" as const;
const baseURL =
  process.env.NUCLEUM_MENU_PARITY_URL ??
  process.env.APP_BASE_URL_NUCLEUM ??
  "https://local.nucleum.app";
const artifactDir = path.join(
  __dirname,
  "..",
  "artifacts",
  "nucleum-menu-webview-parity",
  timestamp()
);
const email = `codex-menu-parity-${Date.now()}@example.test`;
const password = "ProbePass12!";
const browserName =
  process.env.NUCLEUM_MENU_PARITY_BROWSER === "webkit" ? "webkit" : "chromium";

const result: Record<string, unknown> = {
  baseURL,
  browserName,
  email,
  viewport: { width: 390, height: 844 },
  steps: [],
  browserConsole: [],
  pageErrors: [],
  requestFailures: []
};

async function main() {
  await fs.mkdir(artifactDir, { recursive: true });
  const browser =
    browserName === "webkit"
      ? await webkit.launch({ headless: true })
      : await chromium.launch({
          headless: true,
          args: [
            "--host-resolver-rules=MAP local.nucleum.app 127.0.0.1,MAP account-insouth-local.nucleum.app 127.0.0.1"
          ]
        });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });
  const page = await context.newPage();

  page.on("console", async (message) => {
    (result.browserConsole as unknown[]).push(await captureConsole(message));
  });
  page.on("pageerror", (error) => {
    (result.pageErrors as string[]).push(error.stack ?? error.message);
  });
  page.on("requestfailed", (request) => {
    (result.requestFailures as unknown[]).push({
      url: request.url(),
      method: request.method(),
      errorText: request.failure()?.errorText ?? "unknown"
    });
  });

  try {
    await step("auth", async () => {
      await authenticateForProbe(page);
      return {
        url: page.url(),
        tokenPresent: await page.evaluate(() =>
          Boolean(window.localStorage.getItem("authfnToken"))
        )
      };
    });

    await step("enter-app", async () => {
      await ensureInAppOnHome(page, baseURL, project);
      await page.waitForTimeout(1_000);
      await screenshot(page, "01-home.png");
      return await snapshot(page);
    });

    await step("menu-dom", async () => {
      return await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            text: button.textContent?.trim() ?? "",
            ariaLabel: button.getAttribute("aria-label"),
            className: button.className,
            visible:
              rect.width > 0 &&
              rect.height > 0 &&
              getComputedStyle(button).visibility !== "hidden" &&
              getComputedStyle(button).display !== "none",
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            }
          };
        });
      });
    });

    const menuLabels = await resolveVisibleAppMenuLabels(page);
    result.visibleAppMenuLabels = menuLabels;
    for (const label of menuLabels) {
      await step(`click-${label}`, async () => {
        const before = page.url();
        const button = page
          .getByRole("button", { name: new RegExp(`^${escapeRegExp(label)}$`, "i") })
          .first();
        await button.waitFor({ state: "visible", timeout: 10_000 });
        await button.click({ timeout: 5_000 });
        await page.waitForTimeout(1_200);
        await screenshot(page, `click-${slug(label)}.png`);
        return {
          before,
          after: page.url(),
          snapshot: await snapshot(page)
        };
      });
    }
  } finally {
    result.finalUrl = page.url();
    await screenshot(page, "final.png").catch(() => undefined);
    await fs.writeFile(path.join(artifactDir, "final.html"), await page.content());
    result.appLogs = await flushAppLogs(page);
    await fs.writeFile(
      path.join(artifactDir, "result.json"),
      JSON.stringify(result, null, 2)
    );
    await browser.close();
    console.log(`Nucleum menu parity probe artifacts: ${artifactDir}`);
  }
}

async function step(name: string, action: () => Promise<unknown>) {
  const startedAt = Date.now();
  try {
    const details = await action();
    (result.steps as unknown[]).push({
      name,
      ok: true,
      durationMs: Date.now() - startedAt,
      details
    });
  } catch (error) {
    (result.steps as unknown[]).push({
      name,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.stack ?? error.message : String(error)
    });
    throw error;
  }
}

async function screenshot(page: Page, fileName: string) {
  await page.screenshot({
    path: path.join(artifactDir, fileName),
    fullPage: true
  });
}

async function authenticateForProbe(page: Page) {
  await page.goto(`${baseURL}/account/login`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);

  const alreadyAuthed = await page
    .evaluate(() => Boolean(window.localStorage.getItem("authfnToken")))
    .catch(() => false);
  if (alreadyAuthed) return;

  await fillEmail(page, email);
  await page.getByRole("button", { name: /Create password/i }).click();
  await page.locator('input[type="password"]').fill(password);

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/auth/sign-up/password"),
    { timeout: 20_000 }
  );
  await page.getByRole("button", { name: /Sign up with email/i }).click();
  const response = await responsePromise;
  if (!response.ok()) {
    throw new Error(
      `/auth/sign-up/password returned ${response.status()}: ${await response.text()}`
    );
  }
  await page
    .waitForFunction(
      () => Boolean(window.localStorage.getItem("authfnToken")),
      undefined,
      { timeout: 15_000 }
    )
    .catch(() => undefined);
}

async function fillEmail(page: Page, value: string) {
  const input = page
    .getByPlaceholder(/username@email\.com|name@email\.com/i)
    .first();
  await input.waitFor({ state: "visible", timeout: 20_000 });
  await input.fill(value);
}

async function snapshot(page: Page) {
  return await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    bodyText: document.body.innerText.slice(0, 2_000),
    activeElement:
      document.activeElement instanceof HTMLElement
        ? {
            tag: document.activeElement.tagName,
            text: document.activeElement.innerText?.slice(0, 200),
            ariaLabel: document.activeElement.getAttribute("aria-label")
          }
        : null
  }));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function resolveVisibleAppMenuLabels(page: Page) {
  const labels = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button.appmenuitem"))
      .filter((button) => {
        const rect = button.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          getComputedStyle(button).visibility !== "hidden" &&
          getComputedStyle(button).display !== "none"
        );
      })
      .map((button) => button.textContent?.trim() ?? "")
      .filter(Boolean)
  );
  return Array.from(new Set(labels));
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
