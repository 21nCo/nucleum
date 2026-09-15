import { expect, test } from "@playwright/test";
import {
  ensureInAppOnHome,
  expectCurrentSurfaceVisible,
  navigateToSurface
} from "../../utils/helpers";

import {
  requireE2EProduct,
  resolveSurfaceContract
} from "../../../config/e2e.config";

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

  test("calendar classic layout exposes semantic anchors", async ({
    page
  }, testInfo) => {
    await navigateToSurface(
      page,
      "calendar.layout.classic",
      testInfo.project.name
    );
    await expect(page).toHaveURL(/\/calendar/);
  });

  test("supported calendar views switch with semantic anchors", async ({
    page
  }, testInfo) => {
    const executedViews: string[] = [];

    await navigateToSurface(
      page,
      "calendar.layout.classic",
      testInfo.project.name
    );

    const supportedViews = viewContracts.filter((view) =>
      resolveSurfaceContract(
        requireE2EProduct(testInfo.project.name),
        view.surface
      )
    );
    for (const view of supportedViews) {
      await navigateToSurface(page, view.surface, testInfo.project.name);
      executedViews.push(view.label);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expectCurrentSurfaceVisible(
        page,
        view.surface,
        testInfo.project.name
      );
    }

    expect(executedViews).toEqual(supportedViews.map((view) => view.label));
  });

  for (const view of viewContracts) {
    test(`calendar ${view.label} availability and persistence`, async ({
      page
    }, testInfo) => {
      await navigateToSurface(
        page,
        "calendar.layout.classic",
        testInfo.project.name
      );
      if (
        !resolveSurfaceContract(
          requireE2EProduct(testInfo.project.name),
          view.surface
        )
      ) {
        await expect(page.getByText(/^(?:D|Day|Days)$/i)).toHaveCount(0);
        await expect(page.getByTestId("calendar-view-year")).toBeVisible();
        return;
      }
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
