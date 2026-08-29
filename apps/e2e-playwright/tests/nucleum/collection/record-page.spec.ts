import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../../fixtures/e2e-test";
import { ensureInAppOnHome } from "../../utils/helpers";
import {
  openResourceBrowser,
  openResourceRecord
} from "../../utils/resource-matrix";

let e2eSeed: E2ESeed;

async function openCollectionRecordFromLibrary(page: Page, name: string) {
  await openResourceRecord(page, test.info().project.name, "collection", {
    label: name
  });
  await expect(page.getByTestId("resource-record-surface")).toBeVisible({
    timeout: 15_000
  });
}

function collectionRecordSurface(page: Page) {
  return page.getByTestId("resource-record-surface").first();
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
      { message: "expectCollectionRecordSurface: toBe true", timeout: 10_000 }
    )
    .toBe(true);
  await expect(recordSurface.getByText(name).first()).toBeVisible({
    timeout: 15_000
  });
  await expect(
    recordSurface.getByRole("button", { name: /^Add$/i }).first()
  ).toBeVisible({
    timeout: 10_000
  });
}

async function closePropertiesModal(
  page: Page,
  action: "save" | "cancel" = "save"
) {
  const modal = page.locator("#property_edit").first();
  if (!(await modal.isVisible().catch(() => false))) return false;
  const buttonName = action === "save" ? /Save/i : /Cancel/i;
  const button = modal.getByRole("button", { name: buttonName }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click({ timeout: 5_000 }).catch(() => null);
    await modal.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => null);
  }
  return !(await modal.isVisible().catch(() => false));
}

async function enterEditMode(page: Page) {
  const editMode = page
    .getByRole("button", { name: "Enter edit mode" })
    .filter({ visible: true })
    .first();
  if (!(await editMode.isVisible().catch(() => false))) return false;
  await editMode.click({ timeout: 5_000 });
  const titleInput = page.getByPlaceholder("Collection title").first();
  return titleInput
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
}

async function renameCollection(page: Page, renamedCollectionName: string) {
  const titleInput = page.getByPlaceholder("Collection title").first();
  await titleInput.waitFor({ state: "visible", timeout: 10_000 });
  await titleInput.click({ timeout: 5_000, force: true });
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+A" : "Control+A"
  );
  await page.keyboard.type(renamedCollectionName, { delay: 20 });
  await expect(titleInput).toHaveValue(renamedCollectionName, {
    timeout: 10_000
  });
  await page.keyboard.press("Tab").catch(() => null);
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
  await expect(textarea).toHaveValue(description, { timeout: 10_000 });
  const titleInput = page.getByPlaceholder("Collection title").first();
  if (await titleInput.isVisible().catch(() => false)) {
    await titleInput.click({ timeout: 5_000, force: true }).catch(() => null);
  } else {
    await page.mouse.click(24, 24);
  }
  await page.keyboard.press("Escape").catch(() => null);
  await textarea
    .waitFor({ state: "hidden", timeout: 10_000 })
    .catch(() => null);
}

async function updateCover(page: Page) {
  const addCoverButton = page
    .locator('button:has-text("+ Add cover photo")')
    .first();
  const replaceButton = page
    .getByRole("button", { name: /^Replace$/i })
    .first();
  const trigger = (await replaceButton.isVisible().catch(() => false))
    ? replaceButton
    : addCoverButton;

  await trigger.waitFor({ state: "visible", timeout: 10_000 });
  await trigger.click({ timeout: 5_000 });

  const coverPickerHeading = page
    .getByText("Pick a cover", { exact: true })
    .first();
  await coverPickerHeading.waitFor({ state: "visible", timeout: 10_000 });
  const coverPicker = coverPickerHeading.locator(
    "xpath=ancestor::div[contains(@class, 'flex flex-col gap-6')][1]"
  );
  const canvas = coverPicker.locator("canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 10_000 });
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.click(
    box!.x + box!.width * 0.65,
    box!.y + box!.height * 0.35
  );
  const closeButton = page.getByRole("button", { name: /^Close$/i }).first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click({ timeout: 5_000 }).catch(() => null);
  }
  await expect(
    page.getByRole("button", { name: /^Replace$/i }).first()
  ).toBeVisible({
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

  const addPropertyButton = modal
    .getByRole("button", { name: /add property/i })
    .first();
  await addPropertyButton.waitFor({ state: "visible", timeout: 10_000 });
  await addPropertyButton.click({ timeout: 5_000 });

  const labelInput = modal.locator('input[type="text"]').last();
  await labelInput.waitFor({ state: "visible", timeout: 10_000 });
  await labelInput.fill(propertyLabel);

  await closePropertiesModal(page, "save");
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
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+A" : "Control+A"
  );
  await page.keyboard.type(newViewName, { delay: 20 });
  await expect(labelInput).toHaveValue(newViewName, { timeout: 10_000 });
  await page.keyboard.press("Escape").catch(() => null);
  await expect(
    page.getByRole("tab", { name: new RegExp(newViewName, "i") }).first()
  ).toBeVisible({ timeout: 10_000 });
}

async function exitEditMode(page: Page) {
  await closePropertiesModal(page, "save");
  const closeEditMode = page
    .getByRole("button", { name: /Close edit mode/i })
    .first();
  await expect(closeEditMode).toBeVisible({ timeout: 10_000 });
  await closeEditMode.click({ timeout: 5_000 });
  await closeEditMode
    .waitFor({ state: "hidden", timeout: 10_000 })
    .catch(() => null);
}

async function fillCaptureEditor(page: Page, text: string) {
  await page.waitForFunction(
    () =>
      Boolean(
        document.querySelector(
          '[data-testid="capture-editor"] [contenteditable]'
        )
      ),
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

async function addNewItemToCollection(
  page: Page,
  collectionName: string,
  bodyText: string
) {
  const recordSurface = collectionRecordSurface(page)
    .filter({ hasText: collectionName })
    .first();
  const addButton = recordSurface
    .getByRole("button", { name: /^Add$/i })
    .last();
  await expect(addButton).toBeVisible({ timeout: 10_000 });
  await addButton.click({ timeout: 5_000, force: true });

  const createNew = page
    .locator("button:visible")
    .filter({ hasText: "Create new" })
    .first();
  await expect(createNew).toBeVisible({ timeout: 10_000 });
  await createNew.click({ timeout: 5_000, force: true });
  await createNew
    .waitFor({ state: "hidden", timeout: 10_000 })
    .catch(() => null);

  const editor = page.getByTestId("capture-editor").first();
  await expect(editor).toBeVisible({ timeout: 15_000 });

  const contenteditable = page
    .locator('[data-testid="capture-editor"] [contenteditable]')
    .first();
  await contenteditable.click({ timeout: 5_000 });
  await fillCaptureEditor(page, bodyText);
  await expect(contenteditable).toContainText(bodyText, {
    timeout: 10_000
  });

  const saveBtn = page
    .getByTestId("capture-save-button")
    .or(page.getByRole("button", { name: /^Save$/i }))
    .first();
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click({ timeout: 10_000 });
  await expect(editor).toBeHidden({ timeout: 20_000 });
  await expect(recordSurface).toBeVisible({ timeout: 15_000 });
}

function collectionNodeItems(page: Page, collectionName: string) {
  return collectionRecordSurface(page)
    .filter({ hasText: collectionName })
    .getByTestId(/^resource-thumbnail:node:/);
}

async function closeCollectionRecord(page: Page) {
  await openResourceBrowser(page, test.info().project.name, "collection");
}

test.describe("collection - record page (open + tabs) @record-page", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  test("open collection record and assert expected content visible (or N/A if no record page)", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const name = `E2E coll record ${Date.now()}`;
    await e2eSeed.collections.collection({ label: name, resource: "node" });
    await openCollectionRecordFromLibrary(page, name);
    await expectCollectionRecordSurface(page, name);
  });

  test("edit collection record page and persist title, description, cover, properties, and views across reopen", async ({
    page
  }) => {
    test.setTimeout(180_000);
    await ensureInAppOnHome(page);

    const name = `E2E coll editor ${Date.now()}`;
    const renamedName = `${name} Updated`;
    const description = `Collection description ${Date.now()}`;
    const propertyLabel = "Status";
    const viewName = "Status View";

    await e2eSeed.collections.collection({ label: name, resource: "node" });
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

    await expectCollectionRecordSurface(page, renamedName);
    await expect(
      page.getByText(description, { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("tab", { name: new RegExp(viewName, "i") }).first()
    ).toBeVisible({ timeout: 10_000 });

    const immediateReentry = await enterEditMode(page);
    expect(immediateReentry).toBe(true);
    await expect(page.getByPlaceholder("Collection title").first()).toHaveValue(
      renamedName,
      { timeout: 10_000 }
    );
    await expect(
      page.getByRole("button", { name: /^Replace$/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /Edit properties \(1\)/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await exitEditMode(page);

    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureInAppOnHome(page);
    await openResourceBrowser(page, test.info().project.name, "collection");
    await expect(
      page.getByText(renamedName, { exact: true }).first()
    ).toBeVisible({
      timeout: 20_000
    });

    await openCollectionRecordFromLibrary(page, renamedName);
    await expectCollectionRecordSurface(page, renamedName);

    const reentered = await enterEditMode(page);
    expect(reentered).toBe(true);

    await expect(page.getByPlaceholder("Collection title").first()).toHaveValue(
      renamedName,
      {
        timeout: 10_000
      }
    );
    await expect(
      page.getByRole("button", { name: /^Replace$/i }).first()
    ).toBeVisible({
      timeout: 10_000
    });
    await expect(
      page.getByRole("button", { name: /Edit properties \(1\)/i }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("tab", { name: new RegExp(viewName, "i") }).first()
    ).toBeVisible({ timeout: 10_000 });

    const descriptionButton = page
      .locator('button[aria-label="Collection description"]')
      .first();
    await descriptionButton.click({ timeout: 5_000 });
    await expect(
      page.getByPlaceholder("Add a description").first()
    ).toHaveValue(description, {
      timeout: 10_000
    });
  });

  test("create a new item from collection record page and persist it across reopen", async ({
    page
  }) => {
    test.setTimeout(180_000);
    await ensureInAppOnHome(page);

    const name = `E2E coll items ${Date.now()}`;
    const itemBody = `Collection body ${Date.now()}`;

    await e2eSeed.collections.collection({ label: name, resource: "node" });
    await openCollectionRecordFromLibrary(page, name);
    await expectCollectionRecordSurface(page, name);
    await expect(collectionNodeItems(page, name)).toHaveCount(0, {
      timeout: 10_000
    });

    await addNewItemToCollection(page, name, itemBody);
    await expect(collectionNodeItems(page, name)).toHaveCount(1, {
      timeout: 20_000
    });

    await closeCollectionRecord(page);
    await openCollectionRecordFromLibrary(page, name);
    await expectCollectionRecordSurface(page, name);
    await expect(collectionNodeItems(page, name)).toHaveCount(1, {
      timeout: 20_000
    });
  });
});
