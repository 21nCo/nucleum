import type { Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import {
  requireE2EProduct,
  resolveSurfaceContract
} from "../../config/e2e.config";
import { browserShortcutModifier, ensureInAppOnHome } from "../utils/helpers";
import { resolveRepoFsImportPath } from "../utils/repo-fs";
import {
  blockExternalAuthRequests,
  openNodeRecordFromLibraryById
} from "../memory/memory-test-helpers";

let e2eSeed: E2ESeed;

const datafnStorePath = resolveRepoFsImportPath(
  "client/datafn/datafn.store.ts"
);
const nodeStorePath = resolveRepoFsImportPath(
  "client/features/memory/node/node.store.ts"
);
const markdownStorePath = resolveRepoFsImportPath(
  "client/features/memory/markdown/markdown.store.ts"
);

/**
 * Whether the app server serves repo source modules, as the Vite dev server
 * does; a static build answers those imports with HTML.
 */
async function isRepoSourceServed(page: Page) {
  const response = await page.request.get(datafnStorePath);
  return (
    response.ok() && /javascript/.test(response.headers()["content-type"] ?? "")
  );
}

/** Reads a note's starred state from the app's datafn store. */
async function readIsStarred(page: Page, id: string) {
  return page.evaluate(
    async ({ datafnStorePath, id }) => {
      const { datafn } = await import(datafnStorePath);
      const result = await datafn.node.query({ filters: { id } });
      return Boolean(result.data?.[0]?.isStarred);
    },
    { id, datafnStorePath }
  );
}

test.describe("page letters", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("S stars the open resource and the menu shows the letters", async ({
    page
  }, testInfo) => {
    test.skip(
      !resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        "library.nodes"
      ),
      "The open resource is a note opened from the Nodes library, and this product has no nodes"
    );
    test.skip(
      !(await isRepoSourceServed(page)),
      "The starred state is read through repo source modules, which only the Vite dev server serves"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E page letters ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);
    const menuTrigger = page.getByTestId("resource-record-context-menu");
    await expect(menuTrigger).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    const star = page.locator(".popover [data-context-menu-item-id='star']");
    const openMenu = async () => {
      await page.evaluate(() =>
        (document.activeElement as HTMLElement)?.blur()
      );
      await menuTrigger.click();
      await expect(star.first()).toBeVisible({ timeout: 10_000 });
    };
    const closeMenu = async () => {
      await page.keyboard.press("Escape");
      await expect(star.first()).toBeHidden({ timeout: 10_000 });
      await page.evaluate(() =>
        (document.activeElement as HTMLElement)?.blur()
      );
    };

    const menuHint = (value: string) =>
      page
        .locator(`.popover [data-context-menu-item-id='${value}']`)
        .first()
        .getByTestId("context-menu-item-hotkey");

    await openMenu();
    await expect(menuHint("star")).toHaveText("S");
    await expect(menuHint("archive")).toHaveText("A");
    await expect(menuHint("delete")).toHaveText("\u232B");
    await expect(star.first()).not.toContainText("Starred");
    await closeMenu();

    await page.keyboard.press(`${await browserShortcutModifier(page)}+k`);
    await expect(page.getByTestId("command-bar-input")).toBeFocused();
    await expect(page.getByTestId("super-bar-group-context")).toBeVisible();
    const superBarStarHint = page.getByLabel("Press S on the page", {
      exact: true
    });
    await expect(superBarStarHint).toHaveText("S");
    await expect(superBarStarHint).toHaveAttribute(
      "title",
      "Press S on the page"
    );
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("command-bar-input")).toBeHidden({
      timeout: 10_000
    });
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press("s");
    await openMenu();
    await expect(star.first()).toContainText("Starred", { timeout: 10_000 });
    await closeMenu();
    await expect
      .poll(() => readIsStarred(page, node.id), {
        message: "S stars the open note in the datafn store",
        timeout: 10_000
      })
      .toBe(true);

    await page.reload();
    await ensureInAppOnHome(page);
    await openNodeRecordFromLibraryById(page, node.id);
    await expect(menuTrigger).toBeVisible({ timeout: 15_000 });
    await openMenu();
    await expect(star.first()).toContainText("Starred", { timeout: 10_000 });
    await closeMenu();

    await page.keyboard.press("s");
    await openMenu();
    await expect(star.first()).not.toContainText("Starred", {
      timeout: 10_000
    });
    await closeMenu();
    await expect
      .poll(() => readIsStarred(page, node.id), {
        message: "S again unstars the open note in the datafn store",
        timeout: 10_000
      })
      .toBe(false);

    await page.reload();
    await ensureInAppOnHome(page);
    await openNodeRecordFromLibraryById(page, node.id);
    await expect(menuTrigger).toBeVisible({ timeout: 15_000 });
    await openMenu();
    await expect(menuHint("star")).toHaveText("S");
    await expect(star.first()).not.toContainText("Starred");
    await closeMenu();
  });

  test("B opens the open note in a split and B there closes it", async ({
    page
  }, testInfo) => {
    test.skip(
      !resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        "library.nodes"
      ),
      "The open resource is a note opened from the Nodes library, and this product has no nodes"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E split letter ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);
    const menuTrigger = page.getByTestId("resource-record-context-menu");
    // A split opened from a page goes beside that page.
    const splitPane = page.locator("[data-context-zone-pane='besidePage']");
    const splitId = () => new URL(page.url()).searchParams.get("besidePage");
    await expect(menuTrigger).toBeVisible({ timeout: 15_000 });
    await expect(splitPane).toHaveCount(0);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press("b");
    await expect(splitPane.locator("#mdContent")).toContainText(node.label, {
      timeout: 15_000
    });
    await expect
      .poll(splitId, {
        message: "B opens the note in a split beside its page",
        timeout: 10_000
      })
      .toBe(node.id);

    const splitItem = page
      .locator(".popover [data-context-menu-item-id='open-as-split']")
      .first();
    await expect(menuTrigger).toHaveCount(1);
    await menuTrigger.click();
    await expect(splitItem).toContainText("Close split screen");
    await expect(splitItem.getByTestId("context-menu-item-hotkey")).toHaveText(
      "B"
    );
    await page.keyboard.press("Escape");
    await expect(splitItem).toBeHidden({ timeout: 10_000 });
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press("b");
    await expect(splitPane).toHaveCount(0, { timeout: 15_000 });
    await expect
      .poll(splitId, {
        message: "B in the split closes it",
        timeout: 10_000
      })
      .toBeNull();
  });

  test("E puts the caret in the open note's editor and Escape gives the letters back", async ({
    page
  }, testInfo) => {
    test.skip(
      !resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        "library.nodes"
      ),
      "The open resource is a note opened from the Nodes library, and this product has no nodes"
    );
    test.skip(
      !(await isRepoSourceServed(page)),
      "The starred state is read through repo source modules, which only the Vite dev server serves"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E edit letter ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);
    const menuTrigger = page.getByTestId("resource-record-context-menu");
    await expect(menuTrigger).toBeVisible({ timeout: 15_000 });
    const content = page.locator("#mdContent");
    await expect(content).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    const focusedEditor = content.locator("[contenteditable]:focus");
    await expect(focusedEditor).toHaveCount(0);

    await page.keyboard.press("e");
    await expect(focusedEditor).toHaveCount(1, { timeout: 10_000 });
    const typed = `typed after E ${Date.now()}`;
    await page.keyboard.type(typed);
    await expect(content).toContainText(typed);

    await page.keyboard.press("Escape");
    await expect(page.locator("[contenteditable]:focus")).toHaveCount(0);
    await page.keyboard.press("s");
    await expect
      .poll(() => readIsStarred(page, node.id), {
        message: "S after Escape stars the note",
        timeout: 10_000
      })
      .toBe(true);
    await menuTrigger.click();
    await expect(
      page.locator(".popover [data-context-menu-item-id='star']").first()
    ).toContainText("Starred", { timeout: 10_000 });
    await page.keyboard.press("Escape");
    await expect(content).toContainText(typed);

    await page.reload();
    await ensureInAppOnHome(page);
    await openNodeRecordFromLibraryById(page, node.id);
    await expect(page.locator("#mdContent")).toContainText(typed, {
      timeout: 15_000
    });
  });

  test("E brings a narrow split's note editor back from a side panel and edits it", async ({
    page
  }, testInfo) => {
    test.skip(
      !resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        "library.nodes"
      ),
      "The open resource is a note, and this product has no nodes"
    );
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E split edit letter ${Date.now()}`
    });
    await page.goto(`/calendar?beside=${encodeURIComponent(node.id)}`);
    const split = page.locator("[data-context-zone-pane='beside']");
    const content = split.locator("#mdContent");
    const focusedEditor = page.locator("[contenteditable]:focus");
    const menuTrigger = page.getByTestId("resource-record-context-menu");
    const editItem = page
      .locator(".popover [data-context-menu-item-id='edit']")
      .first();
    await expect(content).toBeVisible({ timeout: 15_000 });

    async function openSidePanel() {
      await menuTrigger.click();
      await page
        .locator(".popover [data-context-menu-item-id='activity']")
        .first()
        .click();
      await expect(content).toBeHidden({ timeout: 10_000 });
      await page.evaluate(() =>
        (document.activeElement as HTMLElement)?.blur()
      );
    }

    // A side panel takes the content's place in the narrow split, and E
    // brings the editor back with the caret in it.
    await openSidePanel();
    await expect(focusedEditor).toHaveCount(0);
    await page.keyboard.press("e");
    await expect(content).toBeVisible({ timeout: 10_000 });
    await expect(content.locator("[contenteditable]:focus")).toHaveCount(1, {
      timeout: 10_000
    });
    const typed = `typed in the split ${Date.now()}`;
    await page.keyboard.type(typed);
    await expect(content).toContainText(typed);

    // The Edit item does the same from the menu.
    await page.keyboard.press("Escape");
    await expect(focusedEditor).toHaveCount(0);
    await openSidePanel();
    await menuTrigger.click();
    await expect(editItem.getByTestId("context-menu-item-hotkey")).toHaveText(
      "E"
    );
    await editItem.click();
    await expect(content).toBeVisible({ timeout: 10_000 });
    await expect(content.locator("[contenteditable]:focus")).toHaveCount(1, {
      timeout: 10_000
    });
    const typedAgain = `typed after the menu ${Date.now()}`;
    await page.keyboard.type(typedAgain);
    await expect(content).toContainText(typedAgain);
  });

  test("E and Edit edit a narrow split's note whose editor mounts after its panel switch navigation ended", async ({
    page
  }, testInfo) => {
    test.skip(
      !resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        "library.nodes"
      ),
      "The open resource is a note, and this product has no nodes"
    );
    test.skip(
      !(await isRepoSourceServed(page)),
      "The divider stored late is added through repo source modules, which only the Vite dev server serves"
    );
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E late editor edit letter ${Date.now()}`
    });
    await page.goto(`/calendar?beside=${encodeURIComponent(node.id)}`);
    const split = page.locator("[data-context-zone-pane='beside']");
    const content = split.locator("#mdContent");
    const editors = split.locator("#mdContent [contenteditable]");
    const focusedText = content.locator(
      ':scope > div[data-content="SIMPLE_TEXT"] [contenteditable]:focus'
    );
    const focusedEditor = page.locator("[contenteditable]:focus");
    const menuTrigger = page.getByTestId("resource-record-context-menu");
    const panelParam = `${node.id.slice(-5)}-panel`;
    const lateDividerIds: string[] = [];
    await expect(content).toBeVisible({ timeout: 15_000 });

    async function openSidePanelWithLateDivider() {
      await menuTrigger.click();
      await page
        .locator(".popover [data-context-menu-item-id='activity']")
        .first()
        .click();
      await expect(content).toBeHidden({ timeout: 10_000 });
      await expect
        .poll(() => new URL(page.url()).searchParams.get(panelParam))
        .toBe("activity");
      const lateDividerId = `${node.blockId}_late_divider${lateDividerIds.length}`;
      lateDividerIds.push(lateDividerId);
      await page.evaluate(
        async ({ nodeStorePath, markdownStorePath, node, lateDividerId }) => {
          const { ActiveNodeStore } = await import(nodeStorePath);
          const { mdStores } = await import(markdownStorePath);
          mdStores.forEach(
            (store: { focus: { set(value: undefined): void } }) =>
              store.focus.set(undefined)
          );
          ActiveNodeStore.resolve(node.id).update(
            (current: Record<string, unknown>) => ({
              ...current,
              mdChildOrder: [lateDividerId, node.blockId],
              children: []
            })
          );
        },
        { nodeStorePath, markdownStorePath, node, lateDividerId }
      );
      await page.evaluate(() =>
        (document.activeElement as HTMLElement)?.blur()
      );
      await expect(focusedEditor).toHaveCount(0);
      return lateDividerId;
    }

    async function storeLateDivider(lateDividerId: string) {
      await page.evaluate(
        async ({ datafnStorePath, node, lateDividerId }) => {
          const { datafn } = await import(datafnStorePath);
          await datafn.table("node").mutate([
            {
              operation: "insert",
              id: lateDividerId,
              record: {
                id: lateDividerId,
                label: "",
                body: "",
                contentType: "DIVIDER",
                creationContext: node.id,
                mdChildOrder: [],
                mdParent: [node.id],
                metaType: "",
                parent: node.id,
                parentPath: node.id,
                text: ""
              }
            }
          ]);
        },
        { datafnStorePath, node, lateDividerId }
      );
    }

    async function expectTextFocusOnceLateEditorMounts(lateDividerId: string) {
      await expect
        .poll(() => new URL(page.url()).searchParams.get(panelParam))
        .not.toBe("activity");
      await expect(editors).toHaveCount(0);
      await storeLateDivider(lateDividerId);
      await expect(
        content.locator(':scope > div[data-content="DIVIDER"]').first()
      ).toBeVisible({ timeout: 15_000 });
      await expect(focusedText).toHaveCount(1, { timeout: 10_000 });
    }

    try {
      await test.step("E", async () => {
        const lateDividerId = await openSidePanelWithLateDivider();
        await page.keyboard.press("e");
        await expectTextFocusOnceLateEditorMounts(lateDividerId);
        const typed = `typed after a late E ${Date.now()}`;
        await page.keyboard.type(typed);
        await expect(content).toContainText(typed);
      });

      await test.step("Edit", async () => {
        await page.keyboard.press("Escape");
        await expect(focusedEditor).toHaveCount(0);
        const lateDividerId = await openSidePanelWithLateDivider();
        await menuTrigger.click();
        await page
          .locator(".popover [data-context-menu-item-id='edit']")
          .first()
          .click();
        await expectTextFocusOnceLateEditorMounts(lateDividerId);
        const typed = `typed after a late Edit ${Date.now()}`;
        await page.keyboard.type(typed);
        await expect(content).toContainText(typed);
      });
    } finally {
      await page.evaluate(
        async ({ datafnStorePath, lateDividerIds }) => {
          const { datafn } = await import(datafnStorePath);
          for (const id of lateDividerIds) {
            await datafn.node
              .mutate({ operation: "delete", id })
              .catch(() => undefined);
          }
        },
        { datafnStorePath, lateDividerIds }
      );
    }
  });

  test("Edit and E close the open note's cover picker and edit the note", async ({
    page
  }, testInfo) => {
    test.skip(
      !resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        "library.nodes"
      ),
      "The open resource is a note opened from the Nodes library, and this product has no nodes"
    );
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 800 });
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E cover edit letter ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);
    const menuTrigger = page.getByTestId("resource-record-context-menu");
    const content = page.locator("#mdContent");
    const coverPicker = page.getByText("Pick a cover", { exact: true });
    const focusedEditor = page.locator("[contenteditable]:focus");
    const menuItem = (id: string) =>
      page.locator(`.popover [data-context-menu-item-id='${id}']`).first();
    await expect(content).toBeVisible({ timeout: 15_000 });

    // The cover picker takes the editor's place on the note's page.
    async function openCoverPicker() {
      await menuTrigger.click();
      await menuItem("SET_COVER_PHOTO").click();
      await expect(coverPicker).toBeVisible({ timeout: 10_000 });
      await expect(content).toBeHidden({ timeout: 10_000 });
      await page.evaluate(() =>
        (document.activeElement as HTMLElement)?.blur()
      );
      await expect(focusedEditor).toHaveCount(0);
    }

    async function expectEditing(text: string) {
      await expect(coverPicker).toBeHidden({ timeout: 10_000 });
      await expect(content).toBeVisible({ timeout: 10_000 });
      await expect(content.locator("[contenteditable]:focus")).toHaveCount(1, {
        timeout: 10_000
      });
      await page.keyboard.type(text);
      await expect(content).toContainText(text);
      await page.keyboard.press("Escape");
      await expect(focusedEditor).toHaveCount(0);
    }

    await openCoverPicker();
    await menuTrigger.click();
    await expect(
      menuItem("edit").getByTestId("context-menu-item-hotkey")
    ).toHaveText("E");
    await menuItem("edit").click();
    const typed = `typed after the picker ${Date.now()}`;
    await expectEditing(typed);

    await openCoverPicker();
    await page.keyboard.press("e");
    const typedAgain = `typed after E on the picker ${Date.now()}`;
    await expectEditing(typedAgain);
  });

  test("Edit keeps a side panel open beside the editor in a wide pane", async ({
    page
  }, testInfo) => {
    test.skip(
      !resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        "library.nodes"
      ),
      "The open resource is a note opened from the Nodes library, and this product has no nodes"
    );
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 2400, height: 1000 });
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E wide edit letter ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);
    const menuTrigger = page.getByTestId("resource-record-context-menu");
    const content = page.locator("#mdContent");
    const coverPicker = page.getByText("Pick a cover", { exact: true });
    const menuItem = (id: string) =>
      page.locator(`.popover [data-context-menu-item-id='${id}']`).first();
    await expect(content).toBeVisible({ timeout: 15_000 });

    // The pane is wide enough for the content and a side panel together.
    await menuTrigger.click();
    await menuItem("activity").click();
    await expect(content).toBeVisible();
    const urlWithPanel = page.url();
    await menuTrigger.click();
    await menuItem("SET_COVER_PHOTO").click();
    await expect(coverPicker).toBeVisible({ timeout: 10_000 });
    await expect(content).toBeHidden({ timeout: 10_000 });

    await menuTrigger.click();
    await menuItem("edit").click();
    await expect(coverPicker).toBeHidden({ timeout: 10_000 });
    await expect(content.locator("[contenteditable]:focus")).toHaveCount(1, {
      timeout: 10_000
    });
    expect(page.url()).toBe(urlWithPanel);
    const typed = `typed beside the panel ${Date.now()}`;
    await page.keyboard.type(typed);
    await expect(content).toContainText(typed);
  });

  test("E and Edit on a note that starts with a divider edit its first text block", async ({
    page
  }, testInfo) => {
    test.skip(
      !resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        "library.nodes"
      ),
      "The open resource is a note opened from the Nodes library, and this product has no nodes"
    );
    test.skip(
      !(await isRepoSourceServed(page)),
      "The divider is added through repo source modules, which only the Vite dev server serves"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E divider first edit letter ${Date.now()}`
    });
    const dividerId = `${node.blockId}_divider`;
    await page.evaluate(
      async ({ datafnStorePath, node, dividerId }) => {
        const { datafn } = await import(datafnStorePath);
        await datafn.table("node").mutate([
          {
            operation: "insert",
            id: dividerId,
            record: {
              id: dividerId,
              label: "",
              body: "",
              contentType: "DIVIDER",
              creationContext: node.id,
              mdChildOrder: [],
              mdParent: [node.id],
              metaType: "",
              parent: node.id,
              parentPath: node.id,
              text: ""
            }
          },
          {
            operation: "merge",
            id: node.id,
            record: { id: node.id, mdChildOrder: [dividerId, node.blockId] }
          }
        ]);
      },
      { datafnStorePath, node, dividerId }
    );
    await openNodeRecordFromLibraryById(page, node.id);
    const content = page.locator("#mdContent");
    const blocks = content.locator(':scope > div[id^="md-block-"]');
    await expect(blocks.nth(0)).toHaveAttribute("data-content", "DIVIDER", {
      timeout: 15_000
    });
    const textBlock = blocks.nth(1);
    await expect(textBlock).toHaveAttribute("data-content", "SIMPLE_TEXT");
    const focusedText = textBlock.locator("[contenteditable]:focus");
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await expect(page.locator("[contenteditable]:focus")).toHaveCount(0);

    await page.keyboard.press("e");
    await expect(focusedText).toHaveCount(1, { timeout: 10_000 });
    const typed = `typed after E below a divider ${Date.now()}`;
    await page.keyboard.type(typed);
    await expect(textBlock).toContainText(typed);

    await page.keyboard.press("Escape");
    await expect(page.locator("[contenteditable]:focus")).toHaveCount(0);
    await page.getByTestId("resource-record-context-menu").click();
    await page
      .locator(".popover [data-context-menu-item-id='edit']")
      .first()
      .click();
    await expect(focusedText).toHaveCount(1, { timeout: 10_000 });
    const clicked = `typed after Edit below a divider ${Date.now()}`;
    await page.keyboard.type(clicked);
    await expect(textBlock).toContainText(clicked);
    await expect(blocks.nth(0)).toHaveAttribute("data-content", "DIVIDER");
  });

  test("calendar letters switch the scale and Shift+T goes to today", async ({
    page
  }) => {
    test.skip(
      test.info().project.name !== "nucleum",
      "The classic calendar scale letters are checked on Nucleum"
    );
    test.setTimeout(90_000);
    await ensureInAppOnHome(page);
    await page.goto("/calendar/classic/week");
    const controls = page.getByTestId("calendar-context-controls");
    await expect(controls).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());

    await page.keyboard.press("m");
    await expect(page).toHaveURL(/\/calendar\/classic\/month/);
    const thisMonth = (await controls.innerText()).match(
      /[A-Z][a-z]{2,} \d{4}/
    )?.[0];
    await page.getByRole("button", { name: "Next calendar period" }).click();
    await expect(controls).not.toContainText(thisMonth ?? "");
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press("Shift+T");
    await expect(controls).toContainText(thisMonth ?? "");

    await page.keyboard.press("d");
    await expect(page).toHaveURL(/\/calendar\/classic\/day/);

    await page.goto("/calendar/classic");
    await expect(page).toHaveURL(/\/calendar\/classic\/day/, {
      timeout: 15_000
    });
    await expect(controls).toBeVisible({ timeout: 15_000 });
  });
});
