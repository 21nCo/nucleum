import { test, expect, type Page } from "@playwright/test";
import {
  ensureInAppOnHome,
  openLibraryAndTab,
  LibraryTab,
  runCommand,
  getProductConfig
} from "../../utils/helpers";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

async function createCollection(page: Page, name: string) {
  await runCommand(page, "Create a new collection");
  const titleInput = page.getByPlaceholder("Name of the collection");
  await titleInput.waitFor({ state: "visible", timeout: 15_000 });
  await titleInput.fill(name);
  const modal = page.locator("#collection_create");
  await modal.getByRole("button", { name: /Save.*Enter/i }).click({ timeout: 8_000 });
  await titleInput.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
  await page.waitForTimeout(600);
}

async function openCollectionRecordFromLibrary(page: Page, name: string) {
  await openLibraryAndTab(page, LibraryTab.Collections);
  const container = page.locator("#records-container");
  await expect(container).toBeVisible({ timeout: 15_000 });
  const thumb = container
    .locator('div[id^="thumbnail-"]')
    .filter({ hasText: name })
    .first();
  await expect(thumb).toBeVisible({ timeout: 20_000 });
  await thumb.click({ timeout: 5_000 });
  await page.waitForTimeout(1_500);
}

function collectionRecordSurface(page: Page) {
  return page.locator("div.absolute.inset-0.flex.justify-center.w-full.h-full.bg-bgs1.z-50").first();
}

async function expectCollectionRecordSurface(page: Page, name: string) {
  const recordSurface = collectionRecordSurface(page);
  await expect(recordSurface).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(
      () => {
        const resource = new URL(page.url()).searchParams.get("r");
        return resource?.startsWith("collection:") ?? false;
      },
      { timeout: 10_000 }
    )
    .toBe(true);
  await expect(recordSurface.getByText(name).first()).toBeVisible({ timeout: 15_000 });
  await expect(recordSurface.getByRole("button", { name: /^Add$/i }).first()).toBeVisible({
    timeout: 10_000
  });
}

async function maybeWaitForDebounce(page: Page, ms: number = 1600) {
  await page.waitForTimeout(ms);
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
  const titleInput = page.getByPlaceholder("Collection title").first();
  if (await titleInput.isVisible().catch(() => false)) {
    await titleInput.click({ timeout: 5_000, force: true }).catch(() => null);
  } else {
    await page.mouse.click(24, 24);
  }
  await page.keyboard.press("Escape").catch(() => null);
  await textarea.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
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
  expect(box).toBeTruthy();
  await page.mouse.click(box!.x + box!.width * 0.65, box!.y + box!.height * 0.35);
  await maybeWaitForDebounce(page, 1800);
  const closeButton = page.getByRole("button", { name: /^Close$/i }).first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click({ timeout: 5_000 }).catch(() => null);
  }
  await expect(page.getByRole("button", { name: /^Replace$/i }).first()).toBeVisible({
    timeout: 10_000
  });
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
  await expect(
    page.getByRole("button", { name: /Edit properties \(1\)/i }).first()
  ).toBeVisible({ timeout: 10_000 });
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
  await expect(
    page.getByRole("tab", { name: new RegExp(newViewName, "i") }).first()
  ).toBeVisible({ timeout: 10_000 });
}

async function exitEditMode(page: Page) {
  await closePropertiesModal(page, "save");
  const closeEditMode = page.getByRole("button", { name: /Close edit mode/i }).first();
  await expect(closeEditMode).toBeVisible({ timeout: 10_000 });
  await closeEditMode.click({ timeout: 5_000 });
  await closeEditMode.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
}

async function fillCaptureEditor(page: Page, text: string) {
  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="capture-editor"] [contenteditable]')),
    null,
    { timeout: 10_000 }
  );
  await page.evaluate((value) => {
    const editor = document.querySelector(
      '[data-testid="capture-editor"] [contenteditable]'
    ) as HTMLElement | null;
    if (!editor) throw new Error("Inner capture editor not found");
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

async function addNewItemToCollection(page: Page, collectionName: string, bodyText: string) {
  const recordSurface = collectionRecordSurface(page).filter({ hasText: collectionName }).first();
  const addButton = recordSurface.getByRole("button", { name: /^Add$/i }).last();
  await expect(addButton).toBeVisible({ timeout: 10_000 });
  await addButton.click({ timeout: 5_000, force: true });

  const createNew = page
    .locator("button:visible")
    .filter({ hasText: "Create new" })
    .first();
  await expect(createNew).toBeVisible({ timeout: 10_000 });
  await createNew.click({ timeout: 5_000, force: true });
  await createNew.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);

  const editor = page.getByTestId("capture-editor").first();
  await expect(editor).toBeVisible({ timeout: 15_000 });

  const contenteditable = page.locator('[data-testid="capture-editor"] [contenteditable]').first();
  await contenteditable.click({ timeout: 5_000 });
  await fillCaptureEditor(page, bodyText);
  await maybeWaitForDebounce(page, 1200);

  const saveBtn = page
    .getByTestId("capture-save-button")
    .or(page.getByRole("button", { name: /^Save$/i }))
    .first();
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click({ timeout: 10_000 });
  await maybeWaitForDebounce(page, 2000);

  await expect(recordSurface).toBeVisible({ timeout: 15_000 });
}

function collectionNodeItems(page: Page, collectionName: string) {
  return collectionRecordSurface(page)
    .filter({ hasText: collectionName })
    .locator('div.resource[data-id^="node:"]');
}

async function closeCollectionRecord(page: Page) {
  const libraryUrl = new URL("/library?resource=collection&type=all", page.url()).toString();
  await page.goto(libraryUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_000);
}

test.describe("collection - record page (open + tabs) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("open collection record and assert expected content visible (or N/A if no record page)", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.collection,
      "Collection record page is not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const name = `E2E coll record ${Date.now()}`;
    await createCollection(page, name);
    await openCollectionRecordFromLibrary(page, name);
    await expectCollectionRecordSurface(page, name);
  });

  test("tab switching and visibility on collection record page (or N/A if no tabs)", async ({
    page
  }, testInfo) => {
    test.setTimeout(120_000);
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.collection ||
        !productConfig.capabilities.records.collectionTabs,
      "Collection record tabs are not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const name = `E2E coll tabs ${Date.now()}`;
    await createCollection(page, name);
    await openCollectionRecordFromLibrary(page, name);
    await expectCollectionRecordSurface(page, name);

    const recordSurface = collectionRecordSurface(page);
    const tabs = [
      recordSurface.getByRole("button", { name: /^All$/i }).first(),
      recordSurface.getByRole("button", { name: /^Simple$/i }).first(),
      recordSurface.getByRole("button", { name: /^Typed$/i }).first()
    ];
    for (const tab of tabs) {
      await expect(tab).toBeVisible({ timeout: 10_000 });
    }

    await expect(recordSurface.getByText("No records match the criteria.").first()).toBeVisible({
      timeout: 10_000
    });
  });

  test("edit collection record page and persist title, description, cover, properties, and views across reopen @library-feature", async ({
    page
  }, testInfo) => {
    test.setTimeout(180_000);
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.collection ||
        !productConfig.capabilities.records.collectionEditor,
      "Deep collection editor coverage is not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const name = `E2E coll editor ${Date.now()}`;
    const renamedName = `${name} Updated`;
    const description = `Collection description ${Date.now()}`;
    const propertyLabel = "Status";
    const viewName = "Status View";

    await createCollection(page, name);
    await openCollectionRecordFromLibrary(page, name);
    await expectCollectionRecordSurface(page, name);

    const entered = await enterEditMode(page);
    expect(entered).toBe(true);

    await renameCollection(page, renamedName);
    await editDescription(page, description);
    await updateCover(page);
    await addProperty(page, propertyLabel);
    await addViewAndRename(page, viewName);
    await exitEditMode(page);

    await openLibraryAndTab(page, LibraryTab.Collections);
    await expect(page.getByText(renamedName, { exact: true }).first()).toBeVisible({
      timeout: 20_000
    });

    await openCollectionRecordFromLibrary(page, renamedName);
    await expectCollectionRecordSurface(page, renamedName);

    const reentered = await enterEditMode(page);
    expect(reentered).toBe(true);

    await expect(page.getByPlaceholder("Collection title").first()).toHaveValue(renamedName, {
      timeout: 10_000
    });
    await expect(page.getByRole("button", { name: /^Replace$/i }).first()).toBeVisible({
      timeout: 10_000
    });
    await expect(
      page.getByRole("button", { name: /Edit properties \(1\)/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("tab", { name: new RegExp(viewName, "i") }).first()
    ).toBeVisible({ timeout: 10_000 });

    const descriptionButton = page.locator('button[aria-label="Collection description"]').first();
    await descriptionButton.click({ timeout: 5_000 });
    await expect(page.getByPlaceholder("Add a description").first()).toHaveValue(description, {
      timeout: 10_000
    });
  });

  test("create a new item from collection record page and persist it across reopen @library-feature", async ({
    page
  }, testInfo) => {
    test.setTimeout(180_000);
    const productConfig = getProductConfig(testInfo.project.name);
    test.skip(
      !productConfig.capabilities.records.collection ||
        !productConfig.capabilities.records.collectionEditor,
      "Deep collection editor coverage is not part of this product contract"
    );
    await ensureInAppOnHome(page);

    const name = `E2E coll items ${Date.now()}`;
    const itemBody = `Collection body ${Date.now()}`;

    await createCollection(page, name);
    await openCollectionRecordFromLibrary(page, name);
    await expectCollectionRecordSurface(page, name);
    await expect(collectionNodeItems(page, name)).toHaveCount(0, { timeout: 10_000 });

    await addNewItemToCollection(page, name, itemBody);
    await expect(collectionNodeItems(page, name)).toHaveCount(1, { timeout: 20_000 });

    await closeCollectionRecord(page);
    await openCollectionRecordFromLibrary(page, name);
    await expectCollectionRecordSurface(page, name);
    await expect(collectionNodeItems(page, name)).toHaveCount(1, { timeout: 20_000 });
  });
});
