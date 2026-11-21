import type { Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { expect, test } from "../fixtures/e2e-test";
import { DatafnSeedTransport } from "../fixtures/datafn-seed";
import { ensureInAppOnHome, isCloudAuthModeActive } from "../utils/helpers";
import {
  blockExternalAuthRequests,
  closeNodeRecord
} from "./memory-test-helpers";

function uniqueText(text: string) {
  return `${text} ${randomUUID().slice(0, 6)}`;
}

async function searchNotes(page: Page, query: string) {
  await page.getByRole("button", { name: /command bar/i }).click();
  const input = page.getByTestId("command-bar-input");
  await expect(input).toBeVisible();
  await input.fill(query);
}

async function openSearchMatch(
  page: Page,
  node: { id: string; label: string },
  body: string
) {
  const results = page.getByTestId("super-bar-result");
  await expect(results).toHaveCount(1, { timeout: 15_000 });
  await expect(results).toContainText(node.label);
  await results.getByTestId("link-search-result").click();
  await expect(page.getByTestId("command-bar-input")).toBeHidden();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("page") === node.id
  );
  await expect(page.getByPlaceholder("Node title").first()).toBeVisible();
  await expect(page.getByPlaceholder("Node title").first()).toHaveText(
    node.label
  );
  await expect(page.getByLabel("Markdown editor").first()).toContainText(body);
}

async function expectNoSearchMatches(page: Page) {
  await expect(page.getByText("No results found", { exact: true })).toBeVisible(
    {
      timeout: 15_000
    }
  );
  await expect(page.getByTestId("super-bar-result")).toHaveCount(0);
  await expect(page.getByText("Search failed", { exact: true })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("command-bar-input")).toBeHidden();
}

test.describe("memory - saved note search @browse", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(isCloudAuthModeActive(), "These cases exercise local search");
    await blockExternalAuthRequests(page);
    await ensureInAppOnHome(page);
  });

  test("title and body retrieval opens the right note and tracks persisted edits", async ({
    page,
    seed
  }) => {
    test.setTimeout(120_000);
    const oldQuery = "Obsidian ridge";
    const newQuery = "Quartz valley";
    const oldBody = uniqueText(`${oldQuery} expedition observations`);
    const newBody = uniqueText(`${newQuery} mineral survey`);
    const target = await seed.memory.node({
      label: uniqueText("Atlas journal"),
      content: oldBody
    });
    const distractorBody = uniqueText("Cobalt harbor weather forecast");
    const distractor = await seed.memory.node({
      label: uniqueText("Coastal recipes"),
      content: distractorBody
    });

    await searchNotes(page, "Atlas journal");
    await openSearchMatch(page, target, oldBody);
    await closeNodeRecord(page);
    await searchNotes(page, "Coastal recipes");
    await openSearchMatch(page, distractor, distractorBody);
    await closeNodeRecord(page);
    await searchNotes(page, oldQuery);
    await openSearchMatch(page, target, oldBody);

    const editor = page
      .locator('#mdContent > div[id^="md-block-"]')
      .first()
      .locator("[contenteditable]")
      .first();
    await expect(editor).toBeVisible();
    await editor.fill(newBody);
    await expect(editor).toHaveText(newBody);
    await searchNotes(page, newQuery);
    await openSearchMatch(page, target, newBody);
    await closeNodeRecord(page);
    await page.reload();
    await ensureInAppOnHome(page);

    await searchNotes(page, oldQuery);
    await expectNoSearchMatches(page);
    await searchNotes(page, newQuery);
    await openSearchMatch(page, target, newBody);
    await expect(page.getByLabel("Markdown editor").first()).not.toContainText(
      oldBody
    );
  });

  for (const operation of ["archive", "trash"] as const) {
    test(`${operation} excludes a saved note from active search after reload`, async ({
      page,
      seed
    }, testInfo) => {
      test.setTimeout(90_000);
      const titleQuery = "Sapphire field journal";
      const bodyQuery = "Alpine glacier";
      const body = uniqueText(`${bodyQuery} research findings`);
      const node = await seed.memory.node({
        label: uniqueText(titleQuery),
        content: body
      });
      await searchNotes(page, titleQuery);
      await openSearchMatch(page, node, body);
      await closeNodeRecord(page);

      const transport = new DatafnSeedTransport(page, testInfo);
      await transport.mutate("node", { operation, id: node.id });
      await searchNotes(page, titleQuery);
      await expectNoSearchMatches(page);
      await page.reload();
      await ensureInAppOnHome(page);
      for (const query of [titleQuery, bodyQuery]) {
        await searchNotes(page, query);
        await expectNoSearchMatches(page);
      }
    });
  }
});
