import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import {
  captureConsole,
  ensureInAppOnHome,
  flushAppLogs,
  getAuthPath,
  getBaseURL,
  parseProject,
  runCommand,
  type ProjectName
} from "./runtime";

import "dotenv/config";

interface CollectionStepResult {
  success: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

interface ArtifactData {
  runId: string;
  project: ProjectName;
  baseURL: string;
  collectionName: string;
  renamedCollectionName: string;
  itemName: string;
  steps: Record<string, CollectionStepResult>;
  browserConsole: Array<{ type: string; text: string }>;
  pageErrors: string[];
  requestFailures: Array<{ url: string; errorText: string }>;
  appLogs: string;
}

const artifactsRoot = path.join(
  __dirname,
  "..",
  "artifacts",
  "impromptu-collection-deep-dive"
);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function captureStep(page: Page, artifactDir: string, name: string) {
  await page.screenshot({
    path: path.join(artifactDir, `${name}.png`),
    fullPage: true
  });
  await fs.writeFile(
    path.join(artifactDir, `${name}.html`),
    await page.content(),
    "utf8"
  );
}

async function maybeWaitForDebounce(page: Page, ms: number = 1600) {
  await page.waitForTimeout(ms);
}

async function closeIfVisible(page: Page, name: RegExp | string) {
  const button = page.getByRole("button", { name }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click({ timeout: 5_000 }).catch(() => null);
    await page.waitForTimeout(600);
  }
}

async function closePropertiesModal(page: Page, action: "save" | "cancel" = "save") {
  const modal = page.locator("#property_edit").first();
  if (!(await modal.isVisible().catch(() => false))) return false;
  const buttonName = action === "save" ? /Save/i : /Cancel/i;
  const button = modal.getByRole("button", { name: buttonName }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click({ timeout: 5_000 }).catch(() => null);
    await modal.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
    await page.waitForTimeout(800);
  }
  return !(await modal.isVisible().catch(() => false));
}

async function collectVisibleButtons(page: Page) {
  return page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons
      .map((button) => {
        const element = button as HTMLButtonElement;
        const rect = element.getBoundingClientRect();
        const text =
          element.getAttribute("aria-label") ||
          element.getAttribute("title") ||
          element.textContent?.trim() ||
          "";
        return {
          text,
          visible:
            rect.width > 0 &&
            rect.height > 0 &&
            getComputedStyle(element).visibility !== "hidden" &&
            getComputedStyle(element).display !== "none"
        };
      })
      .filter((entry) => entry.visible && entry.text);
  });
}

async function collectCaptureDiagnostics(page: Page) {
  return page.evaluate(() => {
    const captureEditors = Array.from(
      document.querySelectorAll('[data-testid="capture-editor"]')
    ).map((element) => {
      const html = element as HTMLElement;
      const rect = html.getBoundingClientRect();
      const style = window.getComputedStyle(html);
      return {
        text: html.textContent?.trim() ?? "",
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity
      };
    });

    const saveButtons = Array.from(document.querySelectorAll("button"))
      .map((element) => {
        const html = element as HTMLButtonElement;
        const rect = html.getBoundingClientRect();
        const style = window.getComputedStyle(html);
        const text =
          html.getAttribute("aria-label") ||
          html.getAttribute("title") ||
          html.textContent?.trim() ||
          "";
        return {
          text,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
          display: style.display,
          visibility: style.visibility
        };
      })
      .filter((button) => /save/i.test(button.text));

    return {
      href: window.location.href,
      captureEditors,
      saveButtons
    };
  });
}

async function fillCaptureEditor(page: Page, text: string) {
  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="capture-editor"] [contenteditable]')),
    null,
    { timeout: 5_000 }
  );
  await page.evaluate((value) => {
    const editor = document.querySelector(
      '[data-testid="capture-editor"] [contenteditable]'
    ) as HTMLElement | null;
    if (!editor) {
      throw new Error("Inner capture editor not found");
    }
    editor.focus();
    editor.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: value
      })
    );
    editor.textContent = value;
    editor.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: value
      })
    );
    editor.dispatchEvent(
      new KeyboardEvent("keyup", {
        bubbles: true,
        key: value.slice(-1) || "a"
      })
    );
  }, text);
}

async function createCollection(page: Page, collectionName: string) {
  await runCommand(page, "Create a new collection");
  const titleInput = page.getByPlaceholder("Name of the collection");
  await titleInput.waitFor({ state: "visible", timeout: 15_000 });
  await titleInput.fill(collectionName);
  const modal = page.locator("#collection_create");
  await modal
    .getByRole("button", { name: /Save.*Enter/i })
    .click({ timeout: 5_000 });
  await titleInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
}

async function openCollectionFromLibrary(
  page: Page,
  baseURL: string,
  collectionName: string
) {
  await navigateToCollectionsLibrary(page, baseURL);
  const row = page.locator(".resource").filter({ hasText: collectionName }).first();
  const text = page.getByText(collectionName, { exact: true }).first();
  const target = (await row.isVisible().catch(() => false)) ? row : text;
  await target.waitFor({ state: "visible", timeout: 20_000 });
  await target.click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);
}

async function enterEditMode(page: Page) {
  const candidates = [
    page.getByRole("button", { name: /Enter edit mode/i }).first(),
    page.locator('button[title="Enter edit mode"]').first(),
    page.locator('button[aria-label="Enter edit mode"]').first(),
    page
      .locator('use[href*="pencil-simple-line-light"]')
      .locator("xpath=ancestor::button[1]")
      .first()
  ];

  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click({ timeout: 5_000 }).catch(() => null);
      const titleInput = page.getByPlaceholder("Collection title").first();
      const visible = await titleInput
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (visible) return true;
    }
  }

  return false;
}

async function renameCollection(page: Page, renamedCollectionName: string) {
  const titleInput = page.getByPlaceholder("Collection title").first();
  await titleInput.waitFor({ state: "visible", timeout: 10_000 });
  await titleInput.click({ timeout: 5_000, force: true });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type(renamedCollectionName, { delay: 20 });
  await maybeWaitForDebounce(page);
  await page.keyboard.press("Tab").catch(() => null);
  await maybeWaitForDebounce(page);
}

async function editDescription(page: Page, description: string) {
  const descriptionButton = page
    .locator('button[aria-label="Collection description"]')
    .first();
  await descriptionButton.waitFor({ state: "visible", timeout: 10_000 });
  await descriptionButton.click({ timeout: 5_000 });
  const textarea = page.getByPlaceholder("Add a description").first();
  await textarea.waitFor({ state: "visible", timeout: 10_000 });
  await textarea.fill(description);
  await maybeWaitForDebounce(page, 1800);
  return page.getByText(/Description updated/i).first().isVisible().catch(() => false);
}

async function updateCover(page: Page) {
  const addCoverButton = page.locator('button:has-text("+ Add cover photo")').first();
  const replaceButton = page.getByRole("button", { name: /^Replace$/i }).first();
  const trigger = (await replaceButton.isVisible().catch(() => false))
    ? replaceButton
    : addCoverButton;

  await trigger.waitFor({ state: "visible", timeout: 10_000 });
  await trigger.click({ timeout: 5_000 });

  const coverPickerHeading = page.getByText("Pick a cover", { exact: true }).first();
  await coverPickerHeading.waitFor({ state: "visible", timeout: 10_000 });
  const coverPicker = coverPickerHeading.locator(
    "xpath=ancestor::div[contains(@class, 'flex flex-col gap-6')][1]"
  );
  const canvas = coverPicker.locator("canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 10_000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Cover color picker canvas did not render");

  await page.mouse.click(box.x + box.width * 0.65, box.y + box.height * 0.35);
  await maybeWaitForDebounce(page, 1800);
  await closeIfVisible(page, /^Close$/i);

  return page.getByRole("button", { name: /^Replace$/i }).first().isVisible().catch(() => false);
}

async function addProperty(page: Page, propertyLabel: string) {
  const editPropertiesButton = page
    .locator('button:not([disabled]):has-text("Edit properties")')
    .first();
  await editPropertiesButton.waitFor({ state: "visible", timeout: 10_000 });
  await editPropertiesButton.click({ timeout: 5_000 });

  const modal = page.locator("#property_edit").first();
  await modal.waitFor({ state: "visible", timeout: 10_000 });

  const addPropertyButton = modal.getByRole("button", { name: /add property/i }).first();
  await addPropertyButton.waitFor({ state: "visible", timeout: 10_000 });
  await addPropertyButton.click({ timeout: 5_000 });

  const labelInput = modal.locator('input[type="text"]').last();
  await labelInput.waitFor({ state: "visible", timeout: 10_000 });
  await labelInput.fill(propertyLabel);

  await closePropertiesModal(page, "save");
  await maybeWaitForDebounce(page, 1200);

  return page.getByRole("button", { name: /Edit properties \(1\)/i }).first().isVisible().catch(() => false);
}

async function addViewAndRename(page: Page, newViewName: string) {
  await closePropertiesModal(page, "save");
  const addViewTab = page.getByRole("tab", { name: /^Add view$/i }).last();
  const fallbackAddTab = page.locator(".panel-switcher [role='tab']").last();
  const trigger = (await addViewTab.isVisible().catch(() => false))
    ? addViewTab
    : fallbackAddTab;

  await trigger.waitFor({ state: "visible", timeout: 10_000 });
  await trigger.click({ timeout: 5_000, force: true });

  const labelInput = page.locator('input[placeholder="Label"]:visible').last();
  await labelInput.waitFor({ state: "visible", timeout: 10_000 });
  await labelInput.click({ timeout: 5_000, force: true });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type(newViewName, { delay: 20 });
  await maybeWaitForDebounce(page);
  await page.keyboard.press("Escape").catch(() => null);
  await maybeWaitForDebounce(page, 600);

  return page.getByRole("tab", { name: new RegExp(newViewName, "i") }).first().isVisible().catch(() => false);
}

async function exitEditMode(page: Page) {
  await closePropertiesModal(page, "save");
  const closeEditMode = page.getByRole("button", { name: /Close edit mode/i }).first();
  if (await closeEditMode.isVisible().catch(() => false)) {
    await closeEditMode.click({ timeout: 5_000 });
    const hidden = await closeEditMode
      .waitFor({ state: "hidden", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (hidden) return true;
    await closeEditMode.click({ timeout: 5_000 }).catch(() => null);
    await page.waitForTimeout(800);
    return !(await closeEditMode.isVisible().catch(() => false));
  }
  return false;
}

function resolveCollectionHeader(page: Page, collectionName: string) {
  const stickyHeader = page.locator(".stickyheader").filter({ hasText: collectionName }).first();
  return stickyHeader.locator("xpath=following-sibling::header[1]");
}

function resolveCollectionRecordSurface(page: Page, collectionName: string) {
  return page
    .locator("div.absolute.inset-0.flex.justify-center.w-full.h-full.bg-bgs1.z-50")
    .filter({ hasText: collectionName })
    .first();
}

async function switchCollectionView(page: Page, collectionName: string, viewName: string) {
  const collectionHeader = resolveCollectionHeader(page, collectionName);
  const tab = collectionHeader
    .getByRole("tab", { name: new RegExp(`^${viewName}$`, "i") })
    .first();
  await tab.waitFor({ state: "visible", timeout: 10_000 });
  await tab.click({ timeout: 5_000, force: true });
  await page.waitForTimeout(800);
}

async function addNewItemToCollection(
  page: Page,
  collectionName: string,
  itemBody: string,
  artifactDir: string
) {
  await closePropertiesModal(page, "save");
  const recordSurface = resolveCollectionRecordSurface(page, collectionName);
  const collectionAddButton = recordSurface.getByRole("button", { name: /^Add$/i }).last();
  await collectionAddButton.waitFor({ state: "visible", timeout: 10_000 });
  await collectionAddButton.click({ timeout: 5_000, force: true });
  await page.waitForTimeout(500);
  await captureStep(page, artifactDir, "collection-add-menu");

  const createNew = page
    .locator("button:visible")
    .filter({ hasText: "Create new" })
    .first();
  await createNew.waitFor({ state: "visible", timeout: 10_000 });
  await createNew.click({ timeout: 5_000, force: true });
  await createNew.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => null);
  await page.waitForTimeout(1_200);
  await captureStep(page, artifactDir, "collection-create-new-clicked");
  await fs.writeFile(
    path.join(artifactDir, "collection-create-new-diagnostics.json"),
    JSON.stringify(await collectCaptureDiagnostics(page), null, 2),
    "utf8"
  );

  const editor = page
    .getByTestId("capture-editor")
    .getByPlaceholder("Start typing to capture...")
    .or(
      page.getByTestId("capture-editor").getByRole("textbox", {
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

  await editor.waitFor({ state: "visible", timeout: 15_000 });
  await captureStep(page, artifactDir, "collection-capture-editor-visible");
  await fs.writeFile(
    path.join(artifactDir, "collection-capture-editor-diagnostics.json"),
    JSON.stringify(await collectCaptureDiagnostics(page), null, 2),
    "utf8"
  );
  const contenteditable = page
    .locator('[data-testid="capture-editor"] [contenteditable]')
    .first();
  if (await contenteditable.isVisible().catch(() => false)) {
    await contenteditable.click({ timeout: 5_000 });
    await page.evaluate(() => {
      const editor = document.querySelector(
        '[data-testid="capture-editor"] [contenteditable]'
      ) as HTMLElement | null;
      editor?.focus();
    });
  await fillCaptureEditor(page, itemBody);
  } else {
    await editor.click({ timeout: 5_000, force: true });
    await fillCaptureEditor(page, itemName);
  }
  await maybeWaitForDebounce(page, 1200);
  await captureStep(page, artifactDir, "collection-capture-filled");
  await fs.writeFile(
    path.join(artifactDir, "collection-capture-filled-diagnostics.json"),
    JSON.stringify(await collectCaptureDiagnostics(page), null, 2),
    "utf8"
  );

  const saveBtn = page
    .getByTestId("capture-save-button")
    .or(page.getByRole("button", { name: /^Save$/i }))
    .first();
  await saveBtn.click({ timeout: 10_000 });
  await page.waitForTimeout(2_500);

  const closeBtn = page.getByRole("button", { name: /^Close$/i }).first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ timeout: 5_000 }).catch(() => null);
    await page.waitForTimeout(1_000);
  }

  return page
    .locator("div.absolute.inset-0.flex.justify-center.w-full.h-full.bg-bgs1.z-50")
    .filter({ hasText: collectionName })
    .locator('div.resource[data-id^="node:"]')
    .count();
}

async function navigateToCollectionsLibrary(page: Page, baseURL: string) {
  await page.goto(new URL("/library?resource=collection&type=all", baseURL).toString(), {
    waitUntil: "domcontentloaded"
  });
  await page.waitForTimeout(1_000);
}

async function run() {
  const project = parseProject(process.argv);
  const baseURL = getBaseURL(project);
  const runId = `${timestamp()}-${project}`;
  const artifactDir = path.join(artifactsRoot, runId);
  const authPath = getAuthPath(project);
  const browserConsole: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];
  const requestFailures: Array<{ url: string; errorText: string }> = [];
  const collectionName = `Impromptu Collection ${Date.now()}`;
  const renamedCollectionName = `${collectionName} Updated`;
  const itemName = `Collection Item ${Date.now()}`;
  const itemBody = `Collection body ${Date.now()}`;
  const propertyLabel = "Status";
  const viewName = "Status View";
  const steps: ArtifactData["steps"] = {};

  await fs.mkdir(artifactDir, { recursive: true });

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== "false"
  });

  const context = await browser.newContext({
    storageState: await fs
      .access(authPath)
      .then(() => authPath)
      .catch(() => undefined)
  });

  const page = await context.newPage();

  page.on("console", async (message) => {
    browserConsole.push(await captureConsole(message));
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.stack ?? String(error));
  });
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      browserConsole.push({
        type: "navigation",
        text: frame.url()
      });
    }
  });
  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      errorText: request.failure()?.errorText ?? "unknown"
    });
  });

  const recordStep = async (
    name: string,
    handler: () => Promise<Record<string, unknown> | void>
  ) => {
    console.log(`[collection-deep-dive] start:${name}`);
    try {
      const details =
        (await Promise.race([
          handler(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Step timed out: ${name}`)),
              25_000
            )
          )
        ])) ?? {};
      steps[name] = {
        success: true,
        details
      };
      console.log(`[collection-deep-dive] success:${name}`);
    } catch (error) {
      steps[name] = {
        success: false,
        error: String(error)
      };
      console.log(`[collection-deep-dive] failure:${name} ${String(error)}`);
      await captureStep(page, artifactDir, `${name}-failure`).catch(() => null);
    }
  };

  try {
    await ensureInAppOnHome(page, baseURL, project);
    await captureStep(page, artifactDir, "home");

    await recordStep("createCollection", async () => {
      await createCollection(page, collectionName);
      await captureStep(page, artifactDir, "collection-created");
      return {};
    });

    await recordStep("openCollection", async () => {
      await openCollectionFromLibrary(page, baseURL, collectionName);
      await captureStep(page, artifactDir, "collection-opened");
      return {
        buttons: await collectVisibleButtons(page)
      };
    });

    await recordStep("enterEditMode", async () => {
      const entered = await enterEditMode(page);
      if (!entered) throw new Error("Collection edit mode entry control not found");
      await captureStep(page, artifactDir, "collection-edit-mode");
      return {};
    });

    await recordStep("renameCollection", async () => {
      await renameCollection(page, renamedCollectionName);
      await captureStep(page, artifactDir, "collection-renamed");
      return {};
    });

    await recordStep("editDescription", async () => {
      const updated = await editDescription(page, "Collection description for impromptu coverage.");
      await captureStep(page, artifactDir, "collection-description");
      return { updated };
    });

    await recordStep("updateCover", async () => {
      const coverPresent = await updateCover(page);
      await captureStep(page, artifactDir, "collection-cover");
      return { coverPresent };
    });

    await recordStep("addProperty", async () => {
      const propertyCountVisible = await addProperty(page, propertyLabel);
      await captureStep(page, artifactDir, "collection-property");
      return { propertyCountVisible };
    });

    await recordStep("addViewAndRename", async () => {
      const viewVisible = await addViewAndRename(page, viewName);
      await captureStep(page, artifactDir, "collection-view");
      return { viewVisible };
    });

    await recordStep("exitEditMode", async () => {
      const exited = await exitEditMode(page);
      if (exited) {
        await switchCollectionView(page, renamedCollectionName, "Default").catch(() => null);
      }
      if (!exited) {
        const pencilButton = page
          .locator('use[href*="pencil-simple-line-light"]')
          .locator("xpath=ancestor::button[1]")
          .first();
        if (await pencilButton.isVisible().catch(() => false)) {
          await pencilButton.click({ timeout: 5_000 }).catch(() => null);
          await page.waitForTimeout(800);
        }
      }
      await captureStep(page, artifactDir, "collection-exit-edit-mode");
      return {
        exited:
          !(await page.getByRole("button", { name: /Close edit mode/i }).first().isVisible().catch(() => false))
      };
    });

    await recordStep("addItem", async () => {
      const itemCount = await addNewItemToCollection(
        page,
        renamedCollectionName,
        itemBody,
        artifactDir
      );
      await captureStep(page, artifactDir, "collection-item-added");
      return { itemCount };
    });

    await recordStep("reopenCollection", async () => {
      await navigateToCollectionsLibrary(page, baseURL);
      await openCollectionFromLibrary(page, baseURL, renamedCollectionName);
      await switchCollectionView(page, renamedCollectionName, "Default").catch(() => null);
      const titleVisible = await page
        .getByText(renamedCollectionName, { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      const itemCount = await page
        .locator("div.absolute.inset-0.flex.justify-center.w-full.h-full.bg-bgs1.z-50")
        .filter({ hasText: renamedCollectionName })
        .locator('div.resource[data-id^="node:"]')
        .count();
      const viewVisible = await page
        .getByRole("tab", { name: new RegExp(viewName, "i") })
        .first()
        .isVisible()
        .catch(() => false);
      await captureStep(page, artifactDir, "collection-reopened");
      return {
        titleVisible,
        itemCount,
        viewVisible
      };
    });
  } finally {
    const artifact: ArtifactData = {
      runId,
      project,
      baseURL,
      collectionName,
      renamedCollectionName,
      itemName,
      steps,
      browserConsole,
      pageErrors,
      requestFailures,
      appLogs: await flushAppLogs(page)
    };

    await fs.writeFile(
      path.join(artifactDir, "result.json"),
      JSON.stringify(artifact, null, 2),
      "utf8"
    );

    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
