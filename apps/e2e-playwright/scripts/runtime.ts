import type { ConsoleMessage, JSHandle, Page } from "@playwright/test";
import { nucleusProductConfig } from "../config/nucleus-product.config";
import { memotronProductConfig } from "../config/memotron-product.config";
import { pointronProductConfig } from "../config/pointron-product.config";
import { productE2EConfigs } from "../../../client/products/product.e2e-config";

export type ProjectName = "nucleum" | "memotron" | "pointron";

export function getNavProductConfig(projectName: ProjectName) {
  if (projectName === "memotron") return memotronProductConfig;
  if (projectName === "pointron") return pointronProductConfig;
  return nucleusProductConfig;
}

export function getE2EProductCapabilities(projectName: ProjectName) {
  if (projectName === "memotron") return productE2EConfigs.memotron;
  if (projectName === "pointron") return productE2EConfigs.pointron;
  return productE2EConfigs.nucleus;
}

export function parseProject(argv: string[]): ProjectName {
  const index = argv.findIndex((arg) => arg === "--project");
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (value === "memotron" || value === "pointron" || value === "nucleum") {
    return value;
  }
  return "nucleum";
}

export function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function getBaseURL(projectName: ProjectName): string {
  const defaultBaseURL = process.env.APP_BASE_URL ?? "http://127.0.0.1:4173";
  if (projectName === "nucleum") {
    return (
      process.env.APP_BASE_URL_NUCLEUM ??
      process.env.APP_BASE_URL_NUCLEUS ??
      process.env.APP_BASE_URL ??
      defaultBaseURL
    );
  }
  const envKey = `APP_BASE_URL_${projectName.toUpperCase()}`;
  return process.env[envKey] ?? process.env.APP_BASE_URL ?? defaultBaseURL;
}

export function getAuthPath(projectName: ProjectName): string {
  const path = require("node:path");
  const authDir = path.join(__dirname, "..", ".auth");
  const fileName =
    projectName === "nucleum" ? "user.json" : `user-${projectName}.json`;
  return path.join(authDir, fileName);
}

export function resolveRepoFsImportPath(relativePath: string) {
  const path = require("node:path");
  const repoRoot = path.resolve(__dirname, "..", "..", "..").replace(/\\/g, "/");
  return `/@fs${repoRoot}/${relativePath}`;
}

export function ensureOfflineSessionId() {
  try {
    if (window.localStorage.getItem("offlineSessionId")) return;
    const fallback = () => {
      const bytes = new Uint32Array(4);
      globalThis.crypto?.getRandomValues(bytes);
      return Array.from(bytes, (value) => value.toString(16)).join("-");
    };
    const value = globalThis.crypto?.randomUUID?.() ?? fallback();
    window.localStorage.setItem("offlineSessionId", value);
  } catch {}
}

export async function flushAppLogs(page: Page) {
  try {
    return await page.evaluate(async () => {
      const win = window as unknown as Record<string, unknown>;
      const flush = win.__flushDevLogs;
      const getLogs = win.__getDevLogs;
      if (typeof flush === "function") {
        await flush();
      }
      if (typeof getLogs === "function") {
        return String(getLogs());
      }
      return "";
    });
  } catch (error) {
    return `Failed to flush app logs: ${String(error)}`;
  }
}

async function serializeConsoleArg(handle: JSHandle) {
  try {
    return await handle.jsonValue();
  } catch {
    try {
      return await handle.evaluate((value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack
          };
        }
        if (typeof value === "object" && value !== null) {
          return JSON.parse(JSON.stringify(value));
        }
        return String(value);
      });
    } catch {
      return "[unserializable]";
    }
  }
}

export async function captureConsole(message: ConsoleMessage) {
  const args = await Promise.all(
    message.args().map((arg) => serializeConsoleArg(arg))
  );
  return {
    type: message.type(),
    text: message.text(),
    args
  };
}

export async function ensureInAppOnHome(
  page: Page,
  baseURL: string,
  project: ProjectName
) {
  const productConfig = getNavProductConfig(project);
  const debug = async (message: string) => {
    console.log(`[impromptu.ensureInAppOnHome] ${message}`);
  };
  const safeGoto = async (url: string) => {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
    } catch (error) {
      const message = (error as Error).message || "";
      if (!/ERR_CONNECTION_REFUSED/i.test(message)) throw error;
      await page.waitForTimeout(1_000);
      await page.goto(url, { waitUntil: "domcontentloaded" });
    }
  };

  await safeGoto(baseURL);
  await page.waitForLoadState("domcontentloaded");

  const setOfflineSessionFallback = async () => {
    await debug(`setting offlineSessionId fallback on ${page.url()}`);
    await page.evaluate(ensureOfflineSessionId);
  };

  const goHomeWithOfflineSessionFallback = async (reason: string) => {
    await debug(`${reason} on ${page.url()}, using offline-session fallback`);
    await setOfflineSessionFallback();
    await safeGoto(new URL(`/${productConfig.homePath}`, baseURL).toString());
    await page.waitForLoadState("domcontentloaded").catch(() => null);
    return true;
  };

  const clickContinueOfflineIfVisible = async () => {
    const pathname = new URL(page.url()).pathname;
    const home = `/${productConfig.homePath}`;

    if (pathname === home || pathname.startsWith(`${home}/`)) {
      return false;
    }

    const loginSignup = page
      .getByRole("button", { name: /Login\/Signup/i })
      .first();
    if (await loginSignup.isVisible().catch(() => false)) {
      return goHomeWithOfflineSessionFallback("login/signup shell visible");
    }

    if (pathname === "/") {
      const continueOffline = page
        .getByRole("button", { name: /Continue (using )?offline/i })
        .first();
      try {
        await continueOffline.waitFor({ state: "visible", timeout: 5_000 });
      } catch {
        if (await loginSignup.isVisible().catch(() => false)) {
          return goHomeWithOfflineSessionFallback("login/signup shell visible");
        }
        return false;
      }
      return goHomeWithOfflineSessionFallback("continue offline visible");
    }

    if (pathname === "/account/login") {
      await debug("redirecting /account/login -> /signup before offline flow");
      await safeGoto(new URL("/signup", baseURL).toString());
      await page.waitForLoadState("domcontentloaded").catch(() => null);
    }

    const continueOffline = page
      .getByRole("button", { name: /Continue (using )?offline/i })
      .first();
    const currentPathname = new URL(page.url()).pathname;

    try {
      await continueOffline.waitFor({
        state: "visible",
        timeout: currentPathname === "/signup" ? 10_000 : 5_000
      });
    } catch {
      if (await loginSignup.isVisible().catch(() => false)) {
        return goHomeWithOfflineSessionFallback("login/signup shell visible");
      }
      return false;
    }

    return goHomeWithOfflineSessionFallback("continue offline visible");
  };

  const loginSignupAtStart = page
    .getByRole("button", { name: /Login\/Signup/i })
    .first();
  if (await loginSignupAtStart.isVisible().catch(() => false)) {
    await goHomeWithOfflineSessionFallback("login/signup shell visible at start");
  }

  const continueOfflineAtStart = page
    .getByRole("button", { name: /Continue (using )?offline/i })
    .first();
  if (await continueOfflineAtStart.isVisible().catch(() => false)) {
    await goHomeWithOfflineSessionFallback("continue offline visible at start");
  }

  const pathAtStart = new URL(page.url()).pathname;
  const leftAuthPage =
    pathAtStart !== "/" &&
    pathAtStart !== "/signup" &&
    pathAtStart !== "/account/login"
      ? true
      : pathAtStart === "/signup" || pathAtStart === "/account/login"
        ? false
        : await page
            .waitForURL(
              (url) => {
                const pathname = new URL(url).pathname;
                return (
                  pathname !== "/" &&
                  pathname !== "/signup" &&
                  pathname !== "/account/login"
                );
              },
              { timeout: 7_000, waitUntil: "domcontentloaded" }
            )
            .then(() => true)
            .catch(() => false);

  {
    const handledNow = await clickContinueOfflineIfVisible().catch(() => false);
    if (handledNow) {
      await page.waitForLoadState("domcontentloaded").catch(() => null);
    }
  }

  if (!leftAuthPage) {
    for (let i = 0; i < 4; i += 1) {
      const handled = await clickContinueOfflineIfVisible();
      if (!handled) break;
      await page.waitForLoadState("domcontentloaded").catch(() => null);
    }

    const pathNow = new URL(page.url()).pathname;
    if (pathNow === "/" || pathNow === "/signup" || pathNow === "/account/login") {
      await safeGoto(new URL("/signup", baseURL).toString());
      await page.waitForLoadState("domcontentloaded").catch(() => null);

      for (let i = 0; i < 3; i += 1) {
        const handled = await clickContinueOfflineIfVisible();
        if (!handled) break;
        await page.waitForLoadState("domcontentloaded").catch(() => null);
      }
    }
  }

  const currentPath = new URL(page.url()).pathname;
  const home = `/${productConfig.homePath}`;
  const onHome = currentPath === home || currentPath.startsWith(`${home}/`);

  if (!onHome) {
    await page.goto(new URL(home, baseURL).toString(), {
      waitUntil: "domcontentloaded"
    });
    await page.waitForURL(
      (url) => {
        const pathname = new URL(url).pathname;
        return pathname === home || pathname.startsWith(`${home}/`);
      },
      { timeout: 15_000, waitUntil: "domcontentloaded" }
    );
  }

  const navMarkers = [
    ...productConfig.appMenuNavLabels.map((label) =>
      page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first()
    ),
    page.getByRole("button", { name: "Today" }).first(),
    page.getByRole("button", { name: /command bar/i }).first(),
    page.getByTestId("topnav-account-settings").first(),
    page.getByTestId("leftnav-settings").first()
  ];

  const start = Date.now();
  while (Date.now() - start < 45_000) {
    const quickContinueOffline = page
      .getByRole("button", { name: /Continue (using )?offline/i })
      .first();
    if (await quickContinueOffline.isVisible().catch(() => false)) {
      await goHomeWithOfflineSessionFallback(
        "continue offline became visible during nav poll"
      );
    }

    const quickLoginSignup = page
      .getByRole("button", { name: /Login\/Signup/i })
      .first();
    if (await quickLoginSignup.isVisible().catch(() => false)) {
      await goHomeWithOfflineSessionFallback(
        "login/signup shell visible during nav poll"
      );
    }

    const pathname = new URL(page.url()).pathname;
    if (pathname === "/" || pathname === "/signup" || pathname === "/account/login") {
      await clickContinueOfflineIfVisible().catch(() => false);
    }

    for (const marker of navMarkers) {
      if (await marker.isVisible().catch(() => false)) {
        return;
      }
    }

    await page.waitForTimeout(500);
  }

  throw new Error("Failed to reach in-app home shell");
}

export async function runCommand(page: Page, commandLabel: string) {
  const cmdInput = page.getByTestId("command-bar-input");
  const cmdButton = page.getByRole("button", { name: /command bar/i }).first();
  const shortcut = process.platform === "darwin" ? "Meta+K" : "Control+K";

  if (!(await cmdInput.isVisible().catch(() => false))) {
    const cmdOverlay = page.locator("#CMD").first();
    if (await cmdOverlay.isVisible().catch(() => false)) {
      await page.keyboard.press("Escape").catch(() => null);
      await page.waitForTimeout(300);
    }
  }

  if (!(await cmdInput.isVisible().catch(() => false))) {
    await cmdButton.click({ timeout: 5_000 }).catch(() => null);
  }

  if (!(await cmdInput.isVisible().catch(() => false))) {
    await page.keyboard.press(shortcut).catch(() => null);
  }

  await cmdInput.waitFor({ state: "visible", timeout: 15_000 });
  await cmdInput.fill("");
  await cmdInput.fill(commandLabel);
  await page.keyboard.press("Enter");
  if (await cmdInput.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape").catch(() => null);
    await cmdInput.waitFor({ state: "hidden", timeout: 3_000 }).catch(() => null);
  }
}

export async function openNav(page: Page, project: ProjectName, label: string) {
  const config = getNavProductConfig(project);
  await page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first().click({
    timeout: 10_000
  });
  const expectedPath = config.pathByNavLabel[label];
  if (expectedPath) {
    await page.waitForURL(
      (url) => {
        const pathname = new URL(url).pathname;
        return pathname === expectedPath || pathname.startsWith(`${expectedPath}/`);
      },
      { timeout: 15_000, waitUntil: "domcontentloaded" }
    );
  } else {
    await page.waitForTimeout(1_000);
  }
}

export async function openLibraryResource(page: Page, labelPattern: RegExp) {
  await page.getByRole("button", { name: /^Library$/i }).first().click({
    timeout: 5_000
  });
  await page.waitForURL(
    (url) => /^\/library(\/.*)?$/.test(new URL(url).pathname),
    { timeout: 10_000, waitUntil: "domcontentloaded" }
  );
  const buttonLocator = page.getByRole("button", { name: labelPattern }).first();
  const textLocator = page.getByText(labelPattern).first();
  const useTextLocator = !(await buttonLocator.isVisible().catch(() => false));
  const resourceButton = useTextLocator ? textLocator : buttonLocator;
  await resourceButton.waitFor({ state: "visible", timeout: 10_000 });
  await resourceButton.click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);
}

export const LibraryTab = {
  Nodes: /^Nodes(\s+\d+)?$/i,
  Collections: /^Collections(\s+\d+)?$/i,
  Goals: /^(Goals|Objectives)(\s+\d+)?$/i,
  Tasks: /^Tasks(\s+\d+)?$/i
} as const;
