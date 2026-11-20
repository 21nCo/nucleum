import type { Locator, Page } from "@playwright/test";
import { expect, test, type E2ESeed } from "../fixtures/e2e-test";
import { ensureInAppOnHome, navigateToSurface } from "../utils/helpers";
import { openResourceRecord } from "../utils/resource-matrix";
import {
  blockExternalAuthRequests,
  openNodeRecordFromLibraryById
} from "../memory/memory-test-helpers";

let e2eSeed: E2ESeed;

function selectedTab(page: Page) {
  return page
    .getByTestId("resource-context-tabs")
    .locator('[role="tab"][aria-selected="true"]');
}

test.describe("context zone overflow", () => {
  test.beforeEach(async ({ page, seed }) => {
    e2eSeed = seed;
    await blockExternalAuthRequests(page);
  });

  test("a node's view tabs that do not fit move into a More menu", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E overflow ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);
    const tabs = page
      .getByTestId("resource-context-tabs")
      .locator('[role="tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: 15_000 });
    const total = await tabs.count();
    expect(
      total,
      "the node shows at least three view tabs"
    ).toBeGreaterThanOrEqual(3);
    await expect(page.getByTestId("switcher-more")).toHaveCount(0);

    await page.setViewportSize({ width: 990, height: 900 });
    const more = page.getByTestId("switcher-more");
    await expect(more).toBeVisible({ timeout: 10_000 });
    await expect(tabs).not.toHaveCount(total);

    await more.click();
    const hidden = page.locator(".popover button.contextmenuitem").first();
    await expect(hidden).toBeVisible({ timeout: 10_000 });
    const label = (await hidden.innerText()).trim();
    await hidden.click();
    await expect(selectedTab(page)).toHaveAttribute("aria-label", label);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByTestId("switcher-more")).toHaveCount(0);
    await expect(tabs).toHaveCount(total);
    await expect(selectedTab(page)).toHaveAttribute("aria-label", label);
  });

  test("the More menu of a node's view tabs opens and picks a hidden tab from the keyboard", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 990, height: 900 });
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E overflow keys ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);
    const more = page.getByTestId("switcher-more");
    await expect(more).toBeVisible({ timeout: 15_000 });
    const visibleLabel = (await more.innerText()).trim();
    expect(visibleLabel).toMatch(/^\+\d+$/);
    await expect(more).toHaveAccessibleName(`${visibleLabel} more`);
    await expect(
      page.getByRole("tablist").getByTestId("switcher-more")
    ).toHaveCount(0);

    await more.focus();
    await page.keyboard.press("Enter");
    const items = page.locator(".popover button.contextmenuitem");
    await expect(items.first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("ArrowDown");
    const focused = page.locator(".popover button.contextmenuitem:focus");
    await expect(focused).toHaveCount(1);
    const label = (await focused.innerText()).trim();
    await page.keyboard.press("Enter");
    await expect(selectedTab(page)).toHaveAttribute("aria-label", label);
  });

  test("Option arrows reach Overview tabs hidden in the More menu", async ({
    page
  }) => {
    test.skip(
      test.info().project.name !== "nucleum",
      "Overview tabs in the top bar are a Nucleum surface"
    );
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 990, height: 700 });
    await ensureInAppOnHome(page);
    await page.goto("/overview/dashboard");
    const overviewTabs = page.getByTestId("overview-tabs");
    await expect(overviewTabs).toBeVisible({ timeout: 15_000 });
    await expect(overviewTabs.getByTestId("switcher-more")).toBeVisible({
      timeout: 10_000
    });
    await expect(
      overviewTabs.getByRole("button", { name: "Graph", exact: true })
    ).toHaveCount(0);

    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press("Alt+ArrowRight");
    await expect(page).toHaveURL(/\/overview\/graph/);
    await expect(
      overviewTabs.getByRole("button", { name: "Graph", exact: true })
    ).toBeVisible();
  });

  test("calendar controls in the Year view, whose date has no shorter form, step down instead of running past the top bar", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "nucleum",
      "The calendar layout switcher in the top bar is a Nucleum surface"
    );
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1600, height: 900 });
    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "calendar.layout.classic",
      testInfo.project.name
    );
    const controls = page.getByTestId("calendar-context-controls");
    await expect(controls).toBeVisible({ timeout: 15_000 });
    await controls.getByRole("button", { name: "Year", exact: true }).click();

    for (let width = 1600; width >= 1200; width -= 50) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(
          () =>
            controls.evaluate((element) => {
              const tab = element.closest(
                '[data-testid="top-bar-context-tab"]'
              );
              const last = element.lastElementChild;
              if (!tab || !last) return Number.POSITIVE_INFINITY;
              return Math.round(
                last.getBoundingClientRect().right -
                  tab.getBoundingClientRect().right
              );
            }),
          { message: `controls stay inside the top bar at ${width}px` }
        )
        .toBeLessThanOrEqual(1);
    }
  });

  test("calendar controls keep the least compact level that fits after the date changes", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "nucleum",
      "The calendar layout switcher in the top bar is a Nucleum surface"
    );
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1600, height: 900 });
    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "calendar.layout.classic",
      testInfo.project.name
    );
    const controls = page.getByTestId("calendar-context-controls");
    await expect(controls).toBeVisible({ timeout: 15_000 });
    await controls.getByRole("button", { name: "Year", exact: true }).click();

    let narrowestInlineScale: number | undefined;
    for (let width = 1600; width >= 990; width -= 10) {
      await page.setViewportSize({ width, height: 900 });
      const level = await settledCalendarLevel(page);
      if (level === "4") break;
      if (level === "3") narrowestInlineScale = width;
    }
    expect(narrowestInlineScale).toBeDefined();
    await page.setViewportSize({ width: narrowestInlineScale!, height: 900 });
    await expect(controls).toHaveAttribute("data-level", "3");

    const date = controls.locator('[data-calendar-group="date-short"]');
    const year = (await date.textContent()) ?? "";
    await controls
      .getByRole("button", { name: "Next calendar period" })
      .click();
    await expect(date).not.toHaveText(year);
    await page.evaluate(() =>
      (document.activeElement as HTMLElement | null)?.blur()
    );

    expect(await settledCalendarLevel(page)).toBe("3");
    await expect(
      controls.locator('[data-calendar-group="scale"]')
    ).toBeVisible();
  });

  test("calendar controls hide the date where the scale-in-menu controls do not fit, keeping Next period and the menu usable", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "nucleum",
      "The calendar layout switcher in the top bar is a Nucleum surface"
    );
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1600, height: 900 });
    await ensureInAppOnHome(page);
    await navigateToSurface(
      page,
      "calendar.layout.classic",
      testInfo.project.name
    );
    const controls = page.getByTestId("calendar-context-controls");
    await expect(controls).toBeVisible({ timeout: 15_000 });
    await controls.getByRole("button", { name: "Year", exact: true }).click();

    let dateHiddenWidth: number | undefined;
    for (let width = 1200; width >= 990; width -= 10) {
      await page.setViewportSize({ width, height: 900 });
      if (!(await controls.isVisible())) break;
      if ((await settledCalendarLevel(page)) === "5") {
        dateHiddenWidth = width;
        break;
      }
    }
    expect(dateHiddenWidth).toBeDefined();
    await expect(
      controls.locator('[data-calendar-group="date-arrows"]')
    ).toBeVisible();
    const layout = await controls.evaluate((element) => {
      const tab = element.closest('[data-testid="top-bar-context-tab"]');
      const isHit = (selector: string) => {
        const target = element.querySelector(selector);
        if (!target) return false;
        const box = target.getBoundingClientRect();
        return target.contains(
          document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2
          )
        );
      };
      return {
        overflow: Math.round(
          element.getBoundingClientRect().right -
            (tab?.getBoundingClientRect().right ?? 0)
        ),
        isNextHit: isHit('[aria-label="Next calendar period"]'),
        isMenuHit: isHit('[data-testid="calendar-overflow-menu"]')
      };
    });
    expect(layout).toEqual({
      overflow: expect.any(Number),
      isNextHit: true,
      isMenuHit: true
    });
    expect(layout.overflow).toBeLessThanOrEqual(0);
    await controls
      .getByRole("button", { name: "Next calendar period" })
      .click();
    await expect(controls).toHaveAttribute("data-level", "5");

    await controls.getByTestId("calendar-overflow-menu").click();
    const menu = page.locator("#popovers");
    await expect(menu.getByText("Go to today")).toBeVisible();
    const inlineScale = menu.getByRole("radiogroup", { name: "Scale" });
    if (await inlineScale.count()) {
      await inlineScale.getByRole("radio", { name: "Month" }).click();
    } else {
      await menu.getByRole("button", { name: /^Scale/ }).click();
      await page
        .locator("#secondary-popovers")
        .getByRole("radio", { name: "Month" })
        .click();
    }
    await expect(page).toHaveURL(/\/calendar\/classic\/month/);

    await page.setViewportSize({ width: 1600, height: 900 });
    await page.evaluate(() =>
      (document.activeElement as HTMLElement | null)?.blur()
    );
    await expect(
      controls.locator('[data-calendar-group="date-arrows"]')
    ).toHaveCount(0);
    await expect(controls.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(controls).not.toHaveAttribute("data-level", /^[45]$/);
  });

  test("a short page title keeps its natural width and a long one truncates down to 8rem", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureInAppOnHome(page);
    const identity = page.getByTestId("top-bar-page-identity");

    const short = await e2eSeed.memory.node({ label: "Tiny" });
    await openNodeRecordFromLibraryById(page, short.id);
    await expect(identity).toContainText("Tiny", { timeout: 15_000 });
    for (const width of [1440, 990]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() => identityLayout(page), {
          message: `a short title has no blank space at ${width}px`
        })
        .toMatchObject({ isTruncated: false, trailingSpace: 4 });
      expect((await identityLayout(page)).width).toBeLessThan(128);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    const long = await e2eSeed.memory.node({
      label: `E2E long page title that cannot fit beside the view tabs ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, long.id);
    await expect(identity).toContainText("E2E long page title", {
      timeout: 15_000
    });
    await expect(page.getByTestId("switcher-more")).toHaveCount(0);
    const widest = (await identityLayout(page)).width;
    let isTitleShrunkWithAllTabs = false;
    for (const width of [
      1440, 1380, 1320, 1260, 1200, 1140, 1080, 1020, 990
    ]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() => titleAndMore(page), {
          message: `no view tab moves into More at ${width}px while the title could give up its width`
        })
        .toMatchObject({ isTabHiddenBeforeTitleShrinks: false });
      const state = await titleAndMore(page);
      if (!state.isMoreShown && state.width < widest - 1) {
        isTitleShrunkWithAllTabs = true;
      }
    }
    expect(
      isTitleShrunkWithAllTabs,
      "the long title shrinks while every view tab stays in the row"
    ).toBe(true);
    await expect
      .poll(() => titleAndMore(page), {
        message: "at 990px the extra view tabs are in More"
      })
      .toMatchObject({ isMoreShown: true, isTruncated: true });
    expect((await identityLayout(page)).width).toBeGreaterThanOrEqual(127.5);
  });

  test("a note's record Actions move into the More menu where even the smallest view tabs do not fit, and come back with room", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E record actions in More ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);
    const actionsButton = page.getByTestId("resource-record-context-menu");
    await expect(actionsButton).toBeVisible({ timeout: 15_000 });

    await page.setViewportSize({ width: 990, height: 900 });
    const more = page.getByTestId("switcher-more");
    await expect(more).toBeVisible({ timeout: 10_000 });
    await expect(actionsButton).toHaveCount(0);

    const menuItems = page.locator(".popover button.contextmenuitem");
    const actionsEntry = page.locator(
      ".popover [data-context-menu-item-id='record-actions']"
    );
    const star = page.locator(".popover [data-context-menu-item-id='star']");
    const openStarFromMore = async () => {
      await page.evaluate(() =>
        (document.activeElement as HTMLElement)?.blur()
      );
      await more.click();
      await expect(actionsEntry).toBeVisible({ timeout: 10_000 });
      await expect(menuItems.last()).toHaveAttribute(
        "data-context-menu-item-id",
        "record-actions"
      );
      await actionsEntry.click();
      await expect(star.first()).toBeVisible({ timeout: 10_000 });
    };
    const closeMenus = async () => {
      await page.evaluate(() =>
        (document.activeElement as HTMLElement)?.blur()
      );
      await page.keyboard.press("Escape");
      await expect(star).toHaveCount(0, { timeout: 10_000 });
      await expect(actionsEntry).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menuItems).toHaveCount(0, { timeout: 10_000 });
    };

    await openStarFromMore();
    await expect(
      star.first().getByTestId("context-menu-item-hotkey")
    ).toHaveText("S");
    await expect(star.first()).not.toContainText("Starred");
    await star.first().click();
    await expect(menuItems).toHaveCount(0, { timeout: 10_000 });

    await openStarFromMore();
    await expect(star.first()).toContainText("Starred", { timeout: 10_000 });
    await closeMenus();

    const reopenNote = async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.reload();
      await ensureInAppOnHome(page);
      await openNodeRecordFromLibraryById(page, node.id);
      await expect(actionsButton).toBeVisible({ timeout: 15_000 });
      await page.setViewportSize({ width: 990, height: 900 });
      await expect(more).toBeVisible({ timeout: 10_000 });
      await expect(actionsButton).toHaveCount(0);
    };

    await reopenNote();
    await openStarFromMore();
    await expect(star.first()).toContainText("Starred", { timeout: 10_000 });
    await closeMenus();

    await page.keyboard.press("s");
    await openStarFromMore();
    await expect(star.first()).not.toContainText("Starred", {
      timeout: 10_000
    });
    await closeMenus();

    await reopenNote();
    await openStarFromMore();
    await expect(star.first()).not.toContainText("Starred", {
      timeout: 10_000
    });
    await closeMenus();

    await page.setViewportSize({ width: 1100, height: 900 });
    await expect(actionsButton).toBeVisible({ timeout: 10_000 });
    if ((await more.count()) > 0) {
      await more.click();
      await expect(menuItems.first()).toBeVisible({ timeout: 10_000 });
      await expect(actionsEntry).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(menuItems).toHaveCount(0, { timeout: 10_000 });
    }
    await actionsButton.click();
    await expect(star.first()).toBeVisible({ timeout: 10_000 });
    await expect(star.first()).not.toContainText("Starred");
  });

  test("a note's record Actions in the More menu take the keyboard: arrows pick an action, Enter runs it and Escape steps back", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E record actions keyboard ${Date.now()}`
    });
    await openNodeRecordFromLibraryById(page, node.id);
    await expect(page.getByTestId("resource-record-context-menu")).toBeVisible({
      timeout: 15_000
    });
    await page.setViewportSize({ width: 990, height: 900 });
    const more = page.getByTestId("switcher-more");
    await expect(more).toBeVisible({ timeout: 10_000 });

    const menuItems = page.locator(".popover button.contextmenuitem");
    const actionsEntry = page.locator(
      ".popover [data-context-menu-item-id='record-actions']"
    );
    const star = page.locator(".popover [data-context-menu-item-id='star']");
    const submenuFocus = page.locator(
      "#secondary-popovers button.contextmenuitem:focus"
    );
    /** Presses Down, a bounded number of times, until the target has focus. */
    const arrowDownTo = async (target: Locator, name: string) => {
      for (let presses = 0; presses < 15; presses++) {
        await page.keyboard.press("ArrowDown");
        const isFocused = await target.evaluate(
          (element) => element === element.ownerDocument.activeElement
        );
        if (isFocused) return;
      }
      throw new Error(`Down never reached ${name} within 15 presses`);
    };
    const openMoreByKeyboard = async () => {
      await more.focus();
      await page.keyboard.press("Enter");
      await expect(actionsEntry).toBeVisible({ timeout: 10_000 });
    };
    /** Reopens More > Actions by keyboard and checks Star reads Starred. */
    const expectStarredInActions = async () => {
      await openMoreByKeyboard();
      await arrowDownTo(actionsEntry, "the Actions entry");
      await page.keyboard.press("Enter");
      await expect(star.first()).toContainText("Starred", { timeout: 10_000 });
      await page.keyboard.press("Escape");
      await expect(star).toHaveCount(0, { timeout: 10_000 });
      await page.keyboard.press("Escape");
      await expect(menuItems).toHaveCount(0, { timeout: 10_000 });
    };
    const reopenNote = async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.reload();
      await ensureInAppOnHome(page);
      await openNodeRecordFromLibraryById(page, node.id);
      await expect(
        page.getByTestId("resource-record-context-menu")
      ).toBeVisible({ timeout: 15_000 });
      await page.setViewportSize({ width: 990, height: 900 });
      await expect(more).toBeVisible({ timeout: 10_000 });
    };

    await openMoreByKeyboard();
    await arrowDownTo(actionsEntry, "the Actions entry");
    await page.keyboard.press("Enter");
    await expect(star.first()).toBeVisible({ timeout: 10_000 });
    await expect(submenuFocus).toHaveCount(1);
    await expect(star.first()).not.toContainText("Starred");
    await page.keyboard.press("ArrowDown");
    await expect(submenuFocus).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(star).toHaveCount(0, { timeout: 10_000 });
    await expect(actionsEntry).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menuItems).toHaveCount(0, { timeout: 10_000 });
    await expect(more).toBeFocused();

    await openMoreByKeyboard();
    await actionsEntry.hover();
    await expect(star.first()).toBeVisible({ timeout: 10_000 });
    await arrowDownTo(actionsEntry, "the Actions entry");
    await expect(submenuFocus).toHaveCount(0);
    await page.keyboard.press("ArrowRight");
    await expect(star.first()).toBeVisible();
    await expect(submenuFocus).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(star).toHaveCount(0, { timeout: 10_000 });
    await expect(actionsEntry).toBeFocused();
    await page.mouse.move(1, 899);
    await actionsEntry.hover();
    await expect(star.first()).toBeVisible({ timeout: 10_000 });
    await expect(actionsEntry).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(star.first()).toBeVisible();
    await expect(submenuFocus).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(star).toHaveCount(0, { timeout: 10_000 });
    await expect(actionsEntry).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menuItems).toHaveCount(0, { timeout: 10_000 });
    await page.mouse.move(1, 899);

    await openMoreByKeyboard();
    await arrowDownTo(actionsEntry, "the Actions entry");
    await page.keyboard.press("ArrowRight");
    await expect(star.first()).toBeVisible({ timeout: 10_000 });
    await expect(submenuFocus).toHaveCount(1);
    const isStarFocused = await star
      .first()
      .evaluate((element) => element === element.ownerDocument.activeElement);
    if (!isStarFocused) await arrowDownTo(star.first(), "Star");
    await page.keyboard.press("Enter");
    await expect(menuItems).toHaveCount(0, { timeout: 10_000 });

    await expectStarredInActions();
    await reopenNote();
    await expectStarredInActions();
  });

  test("a window narrower than 990px uses the portrait layout, and from 990px every control in a note's and an objective's top bar context zone is inside it and clickable", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "nucleum",
      "Objective records in the top bar are a Nucleum surface"
    );
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureInAppOnHome(page);
    const node = await e2eSeed.memory.node({
      label: `E2E portrait floor note ${Date.now()}`
    });
    const objectiveLabel = `E2E portrait floor objective ${Date.now()}`;
    await e2eSeed.focus.objective({ label: objectiveLabel });
    const records = [
      {
        name: "note",
        open: () => openNodeRecordFromLibraryById(page, node.id)
      },
      {
        name: "objective",
        open: () =>
          openResourceRecord(page, testInfo.project.name, "objective", {
            label: objectiveLabel
          })
      }
    ];
    const topBar = page.getByTestId("top-bar");
    const record = page.getByTestId("resource-record-surface");

    for (const { name, open } of records) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open();
      await expect(record).toBeVisible({ timeout: 15_000 });
      for (const size of [
        { width: 1000, height: 900 },
        { width: 990, height: 900 },
        { width: 990, height: 600 }
      ]) {
        await page.setViewportSize(size);
        await expect(topBar).toBeVisible({ timeout: 10_000 });
        await expect
          .poll(() => contextZoneMisses(page), {
            message: `every ${name} top bar control is inside the context zone and hit-tests to itself at ${size.width}x${size.height}`
          })
          .toEqual({ controls: expect.any(Number), misses: [] });
        expect((await contextZoneMisses(page)).controls).toBeGreaterThan(1);
      }
      for (const size of [
        { width: 925, height: 600 },
        { width: 900, height: 900 },
        { width: 881, height: 700 },
        { width: 950, height: 900 },
        { width: 989, height: 600 }
      ]) {
        await page.setViewportSize(size);
        await expect(
          topBar,
          `no top bar at ${size.width}x${size.height}`
        ).toHaveCount(0, {
          timeout: 10_000
        });
        // Crossing the floor resets to home, as an orientation flip does, so
        // the open record closes instead of lingering in a hidden layer.
        await expect(record).toHaveCount(0);
      }
    }
  });

  test("the Overview and Calendar top bars keep every control inside the context zone and clickable at 990 and 1000px", async ({
    page
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "nucleum",
      "Overview and the calendar layout switcher in the top bar are Nucleum surfaces"
    );
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureInAppOnHome(page);
    const surfaces = [
      {
        name: "Overview",
        open: async () => {
          await page.goto("/overview/dashboard");
          await expect(page.getByTestId("overview-tabs")).toBeVisible({
            timeout: 15_000
          });
        }
      },
      {
        name: "Calendar",
        open: async () => {
          await navigateToSurface(
            page,
            "calendar.layout.classic",
            testInfo.project.name
          );
          await expect(
            page.getByTestId("calendar-context-controls")
          ).toBeVisible({ timeout: 15_000 });
        }
      }
    ];
    for (const { name, open } of surfaces) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open();
      for (const width of [1000, 990]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByTestId("top-bar")).toBeVisible();
        await expect
          .poll(() => contextZoneMisses(page), {
            message: `every ${name} top bar control is inside the context zone and hit-tests to itself at ${width}px`
          })
          .toEqual({ controls: expect.any(Number), misses: [] });
        expect((await contextZoneMisses(page)).controls).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * The visible controls in the top bar's context tab, and those that run past
 * its right edge or whose centre or right edge hit-tests to something else.
 */
function contextZoneMisses(page: Page) {
  return page.getByTestId("top-bar-context-tab").evaluate((tab) => {
    const edge = tab.getBoundingClientRect().right;
    const controls = [
      ...tab.querySelectorAll<HTMLElement>(
        'button, [role="tab"], [data-testid="switcher-more"]'
      )
    ].filter((control) => {
      if (control.closest('[aria-hidden="true"]')) return false;
      const box = control.getBoundingClientRect();
      return (
        box.width > 0 &&
        box.height > 0 &&
        control.checkVisibility({ visibilityProperty: true })
      );
    });
    const misses: string[] = [];
    for (const control of controls) {
      const box = control.getBoundingClientRect();
      const name =
        control.getAttribute("aria-label") ??
        control.dataset.testid ??
        control.textContent?.trim() ??
        control.tagName;
      const y = box.top + box.height / 2;
      const isHit = (x: number) =>
        control.contains(document.elementFromPoint(x, y));
      if (box.right > edge + 1) misses.push(`${name} runs past the edge`);
      if (!isHit(box.left + box.width / 2)) misses.push(`${name} centre`);
      if (!isHit(box.right - 2)) misses.push(`${name} right edge`);
    }
    return { controls: controls.length, misses };
  });
}

/** The calendar controls' level once the top bar has laid out and measured them. */
function settledCalendarLevel(page: Page) {
  return page.getByTestId("calendar-context-controls").evaluate(
    (element) =>
      new Promise<string | undefined>((resolve) => {
        const frame = (count: number) =>
          requestAnimationFrame(() =>
            count === 0
              ? resolve((element as HTMLElement).dataset.level)
              : frame(count - 1)
          );
        frame(2);
      })
  );
}

function identityLayout(page: Page) {
  return page.getByTestId("top-bar-page-identity").evaluate((element) => {
    const title = element.querySelector('[data-testid="top-bar-page-title"]');
    const truncating = [
      ...element.querySelectorAll<HTMLElement>(".truncate")
    ].some((node) => node.scrollWidth > node.clientWidth);
    const box = element.getBoundingClientRect();
    return {
      width: box.width,
      trailingSpace: title
        ? Math.round(box.right - title.getBoundingClientRect().right)
        : Number.POSITIVE_INFINITY,
      isTruncated: truncating
    };
  });
}

/**
 * Where the long title stands against the view tabs. A tab may sit in More
 * only when the title's width above 8rem could not make room for it: the
 * tabs keep their order, so the first hidden tab is the next one to return.
 */
async function titleAndMore(page: Page) {
  const layout = await identityLayout(page);
  const tabs = await page
    .getByTestId("resource-context-tabs")
    .evaluate((element) => {
      const shown = new Set(
        [...element.querySelectorAll('[role="tab"]')].map((tab) =>
          tab.getAttribute("aria-label")
        )
      );
      const firstHidden = [
        ...element.querySelectorAll<HTMLElement>("[data-switcher-option]")
      ].find((option) => !shown.has(option.getAttribute("aria-label")));
      return {
        isMoreShown: !!element.querySelector('[data-testid="switcher-more"]'),
        firstHiddenWidth: firstHidden?.getBoundingClientRect().width ?? 0
      };
    });
  const minimum = await page.evaluate(
    () => parseFloat(getComputedStyle(document.documentElement).fontSize) * 8
  );
  const slack = Math.max(0, layout.width - minimum);
  return {
    width: layout.width,
    isTruncated: layout.isTruncated,
    isMoreShown: tabs.isMoreShown,
    isTabHiddenBeforeTitleShrinks:
      tabs.isMoreShown && slack > tabs.firstHiddenWidth + 4
  };
}
