import type { Locator } from "@playwright/test";
import { expect, test } from "../fixtures/e2e-test";
import { DatafnSeedTransport } from "../fixtures/datafn-seed";
import { ensureInAppOnHome, navigateToSurface } from "../utils/helpers";
import { resolveRepoFsImportPath } from "../utils/repo-fs";
import { setEditMode } from "./active-session/session-test-support";

const analyticsPath = resolveRepoFsImportPath(
  "client/features/focus/analytics/analytics.store.ts"
);

async function expectObjectiveFocus(
  card: Locator,
  label: string,
  value: string
) {
  const row = card.locator("[data-index]").filter({
    has: card.page().getByText(label, { exact: true })
  });
  await expect(row).toHaveCount(1);
  const focusCell = row.locator(":scope > span").nth(1);
  await expect(focusCell).toBeVisible();
  await expect(focusCell).toHaveText(value);
}

test("known weekly logs produce exact totals and persist top-level objective rollup", async ({
  page,
  seed
}, testInfo) => {
  await ensureInAppOnHome(page);
  await setEditMode(page, false);
  const transport = new DatafnSeedTransport(page, testInfo);
  const parent = await seed.focus.objective({ prefix: "E2E analytics parent" });
  const child = await seed.focus.objective({
    prefix: "E2E analytics child",
    parentId: parent.id,
    parentPath: parent.id
  });
  const other = await seed.focus.objective({ prefix: "E2E analytics other" });
  const originalConfig = await page.evaluate(async (modulePath) => {
    const { analyticsConfigStore } = await import(modulePath);
    const original = structuredClone(analyticsConfigStore.get());
    const period = {
      scale: "DAYS",
      value: { type: "RELATIVE", param: -7 }
    };
    const config = structuredClone(original);
    const days = config.pages.find((entry: any) => entry.label === "Days");
    if (!days) throw new Error("Default Days analytics tab is missing");
    days.cards = [
      {
        id: "e2e-metrics",
        label: "Known week totals",
        type: "metrics",
        period
      },
      {
        id: "e2e-objectives",
        label: "Known week objectives",
        type: "top_n",
        period,
        isGroupByTopLevelObjectives: false
      }
    ];
    await analyticsConfigStore.loader(config);
    return original;
  }, analyticsPath);

  try {
    for (const [objective, daysAgo, focus, breakTime] of [
      [parent, 1, 1200, 300],
      [child, 2, 1800, 600],
      [other, 3, 600, 300],
      [parent, 12, 2700, 900]
    ] as const) {
      const startUnix = await page.evaluate((days) => {
        const date = new Date();
        date.setDate(date.getDate() - days);
        date.setHours(12, 0, 0, 0);
        return date.getTime();
      }, daysAgo);
      const sessionId = transport.createId("session");
      const endUnix = startUnix + (focus + breakTime) * 1000;
      await transport.mutate("session", {
        operation: "insert",
        id: sessionId,
        record: {
          id: sessionId,
          type: "COUNTUP",
          startUnix,
          endUnix,
          elapsed: focus + breakTime,
          extended: 0,
          blocks: [
            {
              id: transport.createEmbeddedId("block"),
              type: 1,
              start: startUnix,
              duration: focus,
              progress: 1
            },
            {
              id: transport.createEmbeddedId("block"),
              type: 0,
              start: startUnix + focus * 1000,
              duration: breakTime,
              progress: 1
            }
          ]
        }
      });
      const logId = transport.createId("sessionLog");
      await transport.mutate("sessionLog", {
        operation: "insert",
        id: logId,
        record: {
          id: logId,
          sessionId,
          objectiveId: objective.id,
          taskId: "",
          startUnix,
          endUnix,
          focus,
          breakTime
        }
      });
    }

    await navigateToSurface(page, "overview.focus", testInfo.project.name);
    const daysTab = page.getByRole("tab", { name: "Days", exact: true });
    await daysTab.click();
    await expect(daysTab).toHaveAttribute("aria-selected", "true");
    const totals = page
      .getByText("Known week totals", { exact: true })
      .locator("xpath=ancestor::header/..");
    for (const [label, value] of [
      ["Focus", "1 h"],
      ["Break", "20 m"],
      ["Total", "1 h 20 m"]
    ]) {
      const metric = totals.getByText(label, { exact: true }).locator("..");
      await expect(metric.getByText(value, { exact: true })).toBeVisible();
    }
    const attribution = page
      .getByText("Known week objectives", { exact: true })
      .locator("xpath=ancestor::header/..");
    await expectObjectiveFocus(attribution, parent.label, "20 m");
    await expectObjectiveFocus(attribution, child.label, "30 m");
    await expectObjectiveFocus(attribution, other.label, "10 m");
    await expect(attribution.locator("[data-index]")).toHaveCount(3);

    await setEditMode(page, true);
    const editableAttribution = page
      .getByPlaceholder("chart title", { exact: true })
      .nth(1)
      .locator("xpath=ancestor::header/..");
    await editableAttribution
      .getByRole("button", { name: "Options", exact: true })
      .click();
    const grouping = page.getByRole("checkbox", {
      name: "Group by top level objectives"
    });
    await expect(grouping).not.toBeChecked();
    await grouping.check();
    await expect(grouping).toBeChecked();
    await page.keyboard.press("Escape");
    await expectObjectiveFocus(editableAttribution, parent.label, "50 m");
    await expectObjectiveFocus(editableAttribution, other.label, "10 m");
    await expect(
      editableAttribution.getByText(child.label, { exact: true })
    ).toHaveCount(0);
    await expect(editableAttribution.locator("[data-index]")).toHaveCount(2);

    await page.reload({ waitUntil: "domcontentloaded" });
    await ensureInAppOnHome(page);
    await navigateToSurface(page, "overview.focus", testInfo.project.name);
    await page.getByRole("tab", { name: "Days", exact: true }).click();
    await setEditMode(page, false);
    await expectObjectiveFocus(attribution, parent.label, "50 m");
    await expectObjectiveFocus(attribution, other.label, "10 m");
    await expect(
      attribution.getByText(child.label, { exact: true })
    ).toHaveCount(0);
    await expect(attribution.locator("[data-index]")).toHaveCount(2);
    for (const [label, value] of [
      ["Focus", "1 h"],
      ["Break", "20 m"],
      ["Total", "1 h 20 m"]
    ]) {
      await expect(
        totals
          .getByText(label, { exact: true })
          .locator("..")
          .getByText(value, { exact: true })
      ).toBeVisible();
    }
    await setEditMode(page, true);
    await editableAttribution
      .getByRole("button", { name: "Options", exact: true })
      .click();
    await expect(grouping).toBeChecked();
  } finally {
    await setEditMode(page, false);
    await page.evaluate(
      async ({ modulePath, config }) => {
        const { analyticsConfigStore } = await import(modulePath);
        await analyticsConfigStore.loader(config);
      },
      { modulePath: analyticsPath, config: originalConfig }
    );
    expect(await transport.cleanup()).toEqual([]);
  }
});
