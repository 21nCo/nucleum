import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type ConsoleMessage, type Page } from "@playwright/test";
import { nucleusProductConfig } from "../config/nucleus-product.config";
import { memotronProductConfig } from "../config/memotron-product.config";
import { pointronProductConfig } from "../config/pointron-product.config";

import "dotenv/config";

type ProjectName = "nucleum" | "memotron" | "pointron";

interface ArtifactData {
  runId: string;
  project: ProjectName;
  baseURL: string;
  titleText: string;
  bodyText: string;
  titleVisibleInLibrary: boolean;
  bodyVisibleInLibrary: boolean;
  titleVisibleInNode: boolean;
  bodyVisibleInNode: boolean;
  pageUrlAfterSave: string;
  pageUrlAfterLibraryOpen: string;
  pageUrlAfterNodeOpen: string;
  browserConsole: Array<{ type: string; text: string }>;
  pageErrors: string[];
  requestFailures: Array<{ url: string; errorText: string }>;
  appLogs: string;
  persistedNodeRecord?: unknown;
  persistedChildRecords?: unknown[];
}

const artifactsRoot = path.join(__dirname, "..", "artifacts", "capture-debug");

function getProductConfig(project: ProjectName) {
  if (project === "memotron") return memotronProductConfig;
  if (project === "pointron") return pointronProductConfig;
  return nucleusProductConfig;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function parseProject(argv: string[]): ProjectName {
  const index = argv.findIndex((arg) => arg === "--project");
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (value === "memotron" || value === "pointron" || value === "nucleum") {
    return value;
  }
  return "nucleum";
}

function getBaseURL(projectName: ProjectName): string {
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

function createOfflineSessionId() {
  const randomUUID = globalThis.crypto?.randomUUID?.();
  if (randomUUID) return randomUUID;

  const values = new Uint32Array(4);
  globalThis.crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16)).join("-");
}

function getAuthPath(projectName: ProjectName): string {
  const authDir = path.join(__dirname, "..", ".auth");
  const fileName =
    projectName === "nucleum" ? "user.json" : `user-${projectName}.json`;
  return path.join(authDir, fileName);
}

async function flushAppLogs(page: Page) {
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

async function inspectIndexedDbNode(page: Page, nodeId: string) {
  try {
    return await page.evaluate(async ({ nodeId }) => {
      const offlineSessionId = window.localStorage.getItem("offlineSessionId");
      const databases = "databases" in indexedDB
        ? await (indexedDB as IDBFactory & {
            databases?: () => Promise<Array<{ name?: string }>>;
          }).databases?.()
        : [];

      const namesFromBrowser = (databases ?? [])
        .map((database) => database.name)
        .filter((name): name is string => !!name);
      const names = Array.from(
        new Set([
          ...(offlineSessionId ? [`${offlineSessionId}-1`] : []),
          ...namesFromBrowser
        ])
      );

      const readStore = <T>(dbName: string, storeName: string, key: string) =>
        new Promise<T | undefined>((resolve, reject) => {
          const openRequest = indexedDB.open(dbName);
          openRequest.onerror = () => reject(openRequest.error);
          openRequest.onsuccess = () => {
            const db = openRequest.result;
            if (!db.objectStoreNames.contains(storeName)) {
              resolve(undefined);
              db.close();
              return;
            }
            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const getRequest = store.get(key);
            getRequest.onerror = () => reject(getRequest.error);
            getRequest.onsuccess = () => {
              resolve(getRequest.result);
              db.close();
            };
          };
        });

      for (const dbName of names) {
        const rootRecord = await readStore<Record<string, unknown>>(
          dbName,
          "node",
          nodeId
        );
        if (!rootRecord) continue;

        const childIds = Array.isArray(rootRecord.children)
          ? rootRecord.children.filter(
              (id): id is string => typeof id === "string"
            )
          : [];

        const childRecords = await Promise.all(
          childIds.map((id) =>
            readStore<Record<string, unknown>>(dbName, "node", id)
          )
        );

        return {
          offlineSessionId,
          dbNames: names,
          dbName,
          rootRecord,
          childRecords
        };
      }

      return {
        offlineSessionId,
        dbNames: names,
        dbName: names[0] ?? null,
        rootRecord: null,
        childRecords: []
      };
    }, { nodeId });
  } catch (error) {
    return {
      dbName: null,
      rootRecord: null,
      childRecords: [],
      error: String(error)
    };
  }
}

async function ensureInAppOnHome(
  page: Page,
  baseURL: string,
  project: ProjectName
) {
  const productConfig = getProductConfig(project);
  const debug = async (message: string) => {
    console.log(`[capture-debug.ensureInAppOnHome] ${message}`);
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
    const value = createOfflineSessionId();
    await page.evaluate((value) => {
      window.localStorage.setItem("offlineSessionId", value);
    }, value);
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
  const onHome =
    currentPath === home || currentPath.startsWith(`${home}/`);

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

async function runCommand(page: Page, commandLabel: string) {
  const cmdButton = page.getByRole("button", { name: /command bar/i });
  await cmdButton.click({ timeout: 5_000 });
  const cmdInput = page.getByTestId("command-bar-input");
  await cmdInput.waitFor({ state: "visible", timeout: 15_000 });
  await cmdInput.fill(commandLabel);
  await page.keyboard.press("Enter");
}

async function openLibraryNodes(page: Page) {
  await page.getByRole("button", { name: /^Library$/i }).click({ timeout: 5_000 });
  await page.waitForURL(
    (url) => /^\/library(\/.*)?$/.test(new URL(url).pathname),
    { timeout: 10_000, waitUntil: "domcontentloaded" }
  );
  const nodesTab = page.getByRole("button", { name: /^Nodes(\s+\d+)?$/i }).first();
  await nodesTab.waitFor({ state: "visible", timeout: 10_000 });
  await nodesTab.click({ timeout: 5_000 });
  await page.waitForTimeout(1500);
}

async function captureConsole(message: ConsoleMessage) {
  return {
    type: message.type(),
    text: message.text()
  };
}

async function main() {
  const project = parseProject(process.argv.slice(2));
  const baseURL = getBaseURL(project);
  const runId = `${timestamp()}-${project}`;
  const artifactDir = path.join(artifactsRoot, runId);
  await fs.mkdir(artifactDir, { recursive: true });

  const browserConsole: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];
  const requestFailures: Array<{ url: string; errorText: string }> = [];

  const contextOptions: Record<string, unknown> = {
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 }
  };
  const authPath = getAuthPath(project);
  try {
    await fs.access(authPath);
    contextOptions.storageState = authPath;
  } catch {}

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  page.on("console", async (message) => {
    browserConsole.push(await captureConsole(message));
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      errorText: request.failure()?.errorText ?? "unknown"
    });
  });

  const titleText = `Capture Debug Title ${Date.now()}`;
  const bodyText = `Capture Debug Body ${Date.now()}`;

  let artifactData: ArtifactData = {
    runId,
    project,
    baseURL,
    titleText,
    bodyText,
    titleVisibleInLibrary: false,
    bodyVisibleInLibrary: false,
    titleVisibleInNode: false,
    bodyVisibleInNode: false,
    pageUrlAfterSave: "",
    pageUrlAfterLibraryOpen: "",
    pageUrlAfterNodeOpen: "",
    browserConsole,
    pageErrors,
    requestFailures,
    appLogs: "",
    persistedNodeRecord: undefined,
    persistedChildRecords: undefined
  };

  try {
    await ensureInAppOnHome(page, baseURL, project);
    await page.screenshot({
      path: path.join(artifactDir, "01-home.png"),
      fullPage: true
    });

    await runCommand(page, "Capture");

    const titleInput = page.locator("#capture-title").first();
    await titleInput.waitFor({ state: "visible", timeout: 15_000 });
    await titleInput.click({ timeout: 5_000 });
    await page.keyboard.type(titleText, { delay: 30 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    const editor = page
      .getByTestId("capture-editor")
      .getByPlaceholder("Start typing to capture...")
      .or(
        page
          .getByTestId("capture-editor")
          .getByRole("textbox", {
            name: /Markdown editor|Start typing/i
          })
      )
      .first();
    const markdownBtn = page.getByRole("button", { name: /^Markdown$/i }).first();
    const editorVisible = await editor.isVisible().catch(() => false);
    if (!editorVisible) {
      await markdownBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(800);
    }
    await editor.waitFor({ state: "visible", timeout: 8_000 });
    const contenteditable = page
      .locator('[data-testid="capture-editor"] [contenteditable="true"]')
      .first();
    if (await contenteditable.isVisible().catch(() => false)) {
      await contenteditable.click({ timeout: 5_000 });
    } else {
      await editor.click();
    }
    await page.keyboard.type(bodyText, { delay: 30 });
    await page.waitForTimeout(1200);

    await page.screenshot({
      path: path.join(artifactDir, "02-after-typing.png"),
      fullPage: true
    });

    const saveBtn = page
      .getByTestId("capture-save-button")
      .or(page.getByRole("button", { name: /^Save$/i }))
      .first();
    await saveBtn.click({ timeout: 10_000 });
    await page.waitForTimeout(5_000);
    artifactData.pageUrlAfterSave = page.url();
    const savedNodeId =
      new URL(page.url()).searchParams.get("r") ?? "";
    if (savedNodeId) {
      const persistedData = await inspectIndexedDbNode(page, savedNodeId);
      artifactData.persistedNodeRecord = persistedData;
      artifactData.persistedChildRecords =
        "childRecords" in persistedData ? persistedData.childRecords : [];
    }

    await page.screenshot({
      path: path.join(artifactDir, "03-after-save.png"),
      fullPage: true
    });

    const closeBtn = page.getByRole("button", { name: "Close" }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(1000);
    }

    await openLibraryNodes(page);
    artifactData.pageUrlAfterLibraryOpen = page.url();

    const titleLocator = page.getByText(titleText, { exact: false }).first();
    const bodyLocator = page.getByText(bodyText, { exact: false }).first();
    artifactData.titleVisibleInLibrary = await titleLocator.isVisible().catch(() => false);
    artifactData.bodyVisibleInLibrary = await bodyLocator.isVisible().catch(() => false);

    await page.screenshot({
      path: path.join(artifactDir, "04-library.png"),
      fullPage: true
    });

    const openTarget = artifactData.titleVisibleInLibrary ? titleLocator : bodyLocator;
    if (await openTarget.isVisible().catch(() => false)) {
      await openTarget.click({ timeout: 5_000 });
      await page.waitForTimeout(2_000);
    }
    artifactData.pageUrlAfterNodeOpen = page.url();

    artifactData.titleVisibleInNode = await page
      .getByText(titleText, { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    artifactData.bodyVisibleInNode = await page
      .getByText(bodyText, { exact: false })
      .first()
      .isVisible()
      .catch(() => false);

    await page.screenshot({
      path: path.join(artifactDir, "05-node-open.png"),
      fullPage: true
    });

    artifactData.appLogs = await flushAppLogs(page);
    await fs.writeFile(
      path.join(artifactDir, "page.html"),
      await page.content(),
      "utf8"
    );
  } catch (error) {
    artifactData.appLogs = await flushAppLogs(page);
    await page.screenshot({
      path: path.join(artifactDir, "failure.png"),
      fullPage: true
    }).catch(() => undefined);
    await fs.writeFile(
      path.join(artifactDir, "page.html"),
      await page.content().catch(() => ""),
      "utf8"
    ).catch(() => undefined);
    await fs.writeFile(
      path.join(artifactDir, "error.txt"),
      String(error),
      "utf8"
    );
    throw error;
  } finally {
    await fs.writeFile(
      path.join(artifactDir, "result.json"),
      JSON.stringify(artifactData, null, 2),
      "utf8"
    );
    if (artifactData.appLogs) {
      await fs.writeFile(
        path.join(artifactDir, "app-logs.txt"),
        artifactData.appLogs,
        "utf8"
      );
    }
    await context.close();
    await browser.close();
  }

  console.log(JSON.stringify({ artifactDir, result: artifactData }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
