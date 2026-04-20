import { test, expect } from "@playwright/test";
import path from "node:path";
import {
  ensureInAppOnHome,
  openLibraryAndTab,
  LibraryTab,
  runCommand,
  getProductConfig
} from "../../../utils/helpers";
import { openDeclaredNodeContentPanel } from "../../../utils/settings-contracts";
import {
  addCollectionThroughCollectionsLane,
  expectCollectionRecordOpenedFromLane,
  expectCollectionTagAbsent,
  expectCollectionTagVisible,
  openCollectionFromCollectionsLane,
  removeCollectionThroughCollectionsLane
} from "../../../utils/collections-lane";

const runtimeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;

test.skip(
  runtimeEnv?.SKIP_E2E === "1",
  "E2E suite disabled by environment"
);

const pdfFixturePath = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "fixtures",
  "files",
  "Lorem_ipsum.pdf"
);

test.describe("node - record page (opening, visibility, tab switching) @regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/*", (route) => {
      const reqUrl = route.request().url();
      if (/accounts\.google\.com/i.test(reqUrl)) route.abort();
      else route.continue();
    });
  });

  async function createNode(page: import("@playwright/test").Page, nodeName: string) {
    await runCommand(page, "Capture");
    const editor = page.getByTestId("capture-editor");
    await editor.waitFor({ state: "visible", timeout: 15_000 });
    await editor.click();
    await page.keyboard.type(nodeName, { delay: 25 });
    await page.waitForTimeout(300);
    const saveBtn = page
      .getByTestId("capture-save-button")
      .or(page.getByRole("button", { name: /^Save$/i }));
    await saveBtn.first().click({ timeout: 10_000 });
    await page.waitForTimeout(1_200);
    const closeBtn = page.getByRole("button", { name: "Close" }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ timeout: 5_000 });
      await page.waitForTimeout(600);
    } else {
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
  }

  async function openNodeRecordFromLibrary(
    page: import("@playwright/test").Page,
    nodeName: string
  ) {
    await openLibraryAndTab(page, LibraryTab.Nodes);
    // Avoid union/or locators (strict-mode violations when multiple nodes match the text).
    const row = page.locator(".resource").filter({ hasText: nodeName }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click({ timeout: 5_000 });
    await page.waitForTimeout(1_500);
  }

  async function openNodeContentPanel(page: import("@playwright/test").Page) {
    await openDeclaredNodeContentPanel(page, test.info().project.name);
    const viewer = page.locator("#viewerContainer");
    const visible = await viewer
      .waitFor({ state: "visible", timeout: 60_000 })
      .then(() => true)
      .catch(() => false);
    if (!visible) {
      throw new Error(
        "E2E_SURFACE_001: PDF viewer did not appear after explicit content-panel navigation"
      );
    }
  }

  async function openNodePanel(
    page: import("@playwright/test").Page,
    name: RegExp
  ) {
    const tab = page.getByRole("tab", { name }).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click({ timeout: 5_000 });
      await page.waitForTimeout(700);
      return;
    }
    const button = page.getByRole("button", { name }).first();
    await button.click({ timeout: 5_000 });
    await page.waitForTimeout(700);
  }

  test("open node record and assert panels/content visible", async ({ page }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const nodeName = `E2E node record ${Date.now()}`;
    await createNode(page, nodeName);
    await openNodeRecordFromLibrary(page, nodeName);

    await expect(page.getByText(nodeName).first()).toBeVisible({
      timeout: 20_000
    });
    await expect(page.getByRole("button", { name: /Close/i }).first()).toBeVisible({
      timeout: 10_000
    });
  });

  test("tab switching and visibility on node record page", async ({ page }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const nodeName = `E2E node tabs ${Date.now()}`;
    await createNode(page, nodeName);
    await openNodeRecordFromLibrary(page, nodeName);

    const tabList = page.getByRole("tablist").first();
    await expect(tabList).toBeVisible({ timeout: 10_000 });

    const tabs = tabList.getByRole("tab");
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    const tabCount = await tabs.count();
    const clickIndexes = Array.from({ length: Math.min(tabCount, 3) }, (_, i) => i);
    for (const idx of clickIndexes) {
      const tab = tabs.nth(idx);
      await tab.click({ timeout: 5_000 });
      await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 5_000 });
      await page.waitForTimeout(300);
    }
  });

  test("open PDF node and confirm viewer only after explicit content-panel navigation", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    await runCommand(page, "Capture");
    await page.waitForTimeout(700);
    await page
      .locator('button[data-value="UPLOAD"]')
      .first()
      .click({ timeout: 8_000 });
    await page
      .locator('input[type="file"][accept*=".pdf"]')
      .first()
      .setInputFiles(pdfFixturePath);

    await openNodeContentPanel(page);
    await expect(page.locator("#viewerContainer")).toBeVisible({
      timeout: 5_000
    });
  });

  test("add collection from node record page collections lane with reopen persistence", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const token = String(Date.now()).slice(-6);
    const nodeName = `NodeCL-${token}`;
    const collectionName = `NCol-${token}`;

    await createNode(page, nodeName);
    await openNodeRecordFromLibrary(page, nodeName);

    await addCollectionThroughCollectionsLane(page, collectionName);
    await expectCollectionTagVisible(page, collectionName);

    await openNodeRecordFromLibrary(page, nodeName);
    await expectCollectionTagVisible(page, collectionName);
  });

  test("open linked collection from node record page collections lane", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const token = String(Date.now()).slice(-6);
    const nodeName = `NodeCLNav-${token}`;
    const collectionName = `NColNav-${token}`;

    await createNode(page, nodeName);
    await openNodeRecordFromLibrary(page, nodeName);

    await addCollectionThroughCollectionsLane(page, collectionName);
    await expectCollectionTagVisible(page, collectionName);
    await openCollectionFromCollectionsLane(page, collectionName);
    await expectCollectionRecordOpenedFromLane(page, collectionName);
  });

  test("remove collection from node record page collections lane on current page", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const token = String(Date.now()).slice(-6);
    const nodeName = `NodeCLRm-${token}`;
    const collectionName = `NColRm-${token}`;

    await createNode(page, nodeName);
    await openNodeRecordFromLibrary(page, nodeName);

    await addCollectionThroughCollectionsLane(page, collectionName);
    await expectCollectionTagVisible(page, collectionName);
    await removeCollectionThroughCollectionsLane(page, collectionName);
    await expectCollectionTagAbsent(page, collectionName);
  });

  test("link node from node record page links panel and verify reopen persistence", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const token = String(Date.now()).slice(-6);
    const sourceNodeName = `NodeLinkSrc-${token}`;
    const targetNodeName = `NodeLinkTgt-${token}`;

    await createNode(page, targetNodeName);
    await createNode(page, sourceNodeName);
    await openNodeRecordFromLibrary(page, sourceNodeName);

    await openNodePanel(page, /^Links$/i);

    const searchInput = page
      .getByPlaceholder(/Start searching to add a direct link/i)
      .first();
    await searchInput.waitFor({ state: "visible", timeout: 15_000 });
    await searchInput.fill(targetNodeName);
    await page.waitForTimeout(1500);

    const resultItem = page.getByText(targetNodeName, { exact: false }).first();
    await resultItem.waitFor({ state: "visible", timeout: 15_000 });
    await resultItem.click({ timeout: 5_000 });
    await page.waitForTimeout(1500);

    const linkedItem = page
      .locator('[data-id], .resource, .group')
      .filter({ hasText: targetNodeName })
      .first();
    await expect(linkedItem).toBeVisible({ timeout: 10_000 });

    await openNodeRecordFromLibrary(page, sourceNodeName);
    await openNodePanel(page, /^Links$/i);
    await expect(
      page
        .locator('[data-id], .resource, .group')
        .filter({ hasText: targetNodeName })
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("link node from node record page links panel with keyboard selection and verify reopen persistence", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const token = String(Date.now()).slice(-6);
    const sourceNodeName = `NodeLinkKeySrc-${token}`;
    const targetNodeName = `NodeLinkKeyTgt-${token}`;

    await createNode(page, targetNodeName);
    await createNode(page, sourceNodeName);
    await openNodeRecordFromLibrary(page, sourceNodeName);

    await openNodePanel(page, /^Links$/i);

    const searchInput = page
      .getByPlaceholder(/Start searching to add a direct link/i)
      .first();
    await searchInput.waitFor({ state: "visible", timeout: 15_000 });
    await searchInput.fill(targetNodeName);
    await page.waitForTimeout(1200);
    await searchInput.press("ArrowDown").catch(() => null);
    await page.waitForTimeout(300);
    await searchInput.press("Enter");
    await page.waitForTimeout(1500);

    await expect(
      page
        .locator('[data-id], .resource, .group')
        .filter({ hasText: targetNodeName })
        .first()
    ).toBeVisible({ timeout: 10_000 });

    await openNodeRecordFromLibrary(page, sourceNodeName);
    await openNodePanel(page, /^Links$/i);
    await expect(
      page
        .locator('[data-id], .resource, .group')
        .filter({ hasText: targetNodeName })
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("link node from node record page after focusing a markdown block and verify reopen persistence", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const token = String(Date.now()).slice(-6);
    const sourceNodeName = `NodeLinkFocusSrc-${token}`;
    const targetNodeName = `NodeLinkFocusTgt-${token}`;

    await createNode(page, targetNodeName);
    await createNode(page, sourceNodeName);
    await openNodeRecordFromLibrary(page, sourceNodeName);

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const contentTab = page.getByRole("tablist").first().getByRole("tab").first();
    await expect(contentTab).toBeVisible({ timeout: 10_000 });
    await contentTab.click({ timeout: 5_000 });
    await expect(contentTab).toHaveAttribute("aria-selected", "true", {
      timeout: 5_000
    });

    const editor = page
      .getByRole("textbox", { name: /Markdown editor/i })
      .or(
        page
          .locator('[contenteditable="true"]')
          .filter({ hasNot: page.locator("#capture-title") })
      )
      .first();
    await editor.waitFor({ state: "visible", timeout: 15_000 });
    await editor.click({ timeout: 5_000 });
    await page.keyboard.type(` Focused ${token}`, { delay: 20 });
    await page.waitForTimeout(1200);

    await openNodePanel(page, /^Links$/i);

    const searchInput = page
      .getByPlaceholder(/Start searching to add a direct link/i)
      .first();
    await searchInput.waitFor({ state: "visible", timeout: 15_000 });
    await searchInput.fill(targetNodeName);
    await page.waitForTimeout(1500);

    const resultItem = page.getByText(targetNodeName, { exact: false }).first();
    await resultItem.waitFor({ state: "visible", timeout: 15_000 });
    await resultItem.click({ timeout: 5_000 });
    await page.waitForTimeout(1500);

    await expect(
      page
        .locator('[data-id], .resource, .group')
        .filter({ hasText: targetNodeName })
        .first()
    ).toBeVisible({ timeout: 10_000 });

    await openNodeRecordFromLibrary(page, sourceNodeName);
    await openNodePanel(page, /^Links$/i);
    await expect(
      page
        .locator('[data-id], .resource, .group')
        .filter({ hasText: targetNodeName })
        .first()
    ).toBeVisible({ timeout: 10_000 });
    expect(pageErrors).toEqual([]);
  });

  test("open side notes on node record page without props_invalid_value errors", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const nodeName = `NodeSidenotes-${Date.now()}`;
    await createNode(page, nodeName);
    await openNodeRecordFromLibrary(page, nodeName);
    await openNodePanel(page, /^Side notes$/i);

    await expect(page.getByPlaceholder(/Add notes/i).first()).toBeVisible({
      timeout: 15_000
    });
    expect(
      pageErrors.filter((message) => message.includes("props_invalid_value"))
    ).toEqual([]);
  });

  test("side notes persist after navigating away and reopening node record page", async ({
    page
  }, testInfo) => {
    test.skip(
      !getProductConfig(testInfo.project.name).capabilities.records.node,
      "Node record page is not part of this product contract"
    );
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const nodeName = `NodeSidenotesPersist-${Date.now()}`;
    const noteText = `Persistent sidenote ${Date.now()}`;
    await createNode(page, nodeName);
    await openNodeRecordFromLibrary(page, nodeName);
    await openNodePanel(page, /^Side notes$/i);

    const notesInput = page.getByPlaceholder(/Add notes/i).first();
    await notesInput.waitFor({ state: "visible", timeout: 15_000 });
    await notesInput.click({ timeout: 5_000 });
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+A" : "Control+A"
    ).catch(() => null);
    await page.keyboard.type(noteText, { delay: 20 });
    await page.waitForTimeout(1600);

    await openNodeRecordFromLibrary(page, nodeName);
    await openNodePanel(page, /^Side notes$/i);

    await expect(page.getByPlaceholder(/Add notes/i).first()).toContainText(noteText, {
      timeout: 15_000
    });
  });
});
