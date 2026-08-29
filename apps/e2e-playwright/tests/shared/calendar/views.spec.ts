import { expect, test } from "@playwright/test";
import {
  ensureInAppOnHome,
  expectCurrentSurfaceVisible,
  navigateToSurface
} from "../../utils/helpers";

const viewContracts = [
  {
    label: "day",
    surface: "calendar.view.day" as const
  },
  {
    label: "month",
    surface: "calendar.view.month" as const
  },
  {
    label: "year",
    surface: "calendar.view.year" as const
  }
] as const;

test.describe("calendar view matrix @smoke", () => {
  test.beforeEach(async ({ page }) => {
    await ensureInAppOnHome(page);
  });

  test("calendar bird layout exposes semantic anchors", async ({
    page
  }, testInfo) => {
    await navigateToSurface(
      page,
      "calendar.layout.bird",
      testInfo.project.name
    );
    await expect(page).toHaveURL(/\/calendar/);
  });

  test("calendar day, month, and year views switch with semantic anchors", async ({
    page
  }, testInfo) => {
    const executedViews: string[] = [];

    await navigateToSurface(
      page,
      "calendar.layout.bird",
      testInfo.project.name
    );

    for (const view of viewContracts) {
      await navigateToSurface(page, view.surface, testInfo.project.name);
      executedViews.push(view.label);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expectCurrentSurfaceVisible(
        page,
        view.surface,
        testInfo.project.name
      );
    }

    expect(executedViews).toEqual(viewContracts.map((view) => view.label));
  });

  for (const view of viewContracts) {
    test(`calendar ${view.label} view exposes semantic anchors`, async ({
      page
    }, testInfo) => {
      await navigateToSurface(
        page,
        "calendar.layout.bird",
        testInfo.project.name
      );
      await navigateToSurface(page, view.surface, testInfo.project.name);

      await expect(page).toHaveURL(/\/calendar/);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expectCurrentSurfaceVisible(
        page,
        view.surface,
        testInfo.project.name
      );
    });
  }
});
