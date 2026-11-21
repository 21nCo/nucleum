import type { Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { expect, test } from "../fixtures/e2e-test";
import { DatafnSeedTransport } from "../fixtures/datafn-seed";
import { ensureInAppOnHome, isCloudAuthModeActive } from "../utils/helpers";
import {
  blockExternalAuthRequests,
  closeNodeRecord
} from "./memory-test-helpers";

function searchToken(prefix: string) {
  return `${prefix}${randomUUID().replaceAll("-", "")}`;
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
  await results.getByRole("button").click();
  await expect(page.getByTestId("command-bar-input")).toBeHidden();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("page") === node.id
  );
  await expect(page.getByPlaceholder("Node title").first()).toHaveValue(
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
    const oldBody = searchToken("Obsidian");
    const newBody = searchToken("Quartz");
    const target = await seed.memory.node({
      label: searchToken("Atlas"),
      content: oldBody
    });
    const distractorBody = searchToken("Cobalt");
    const distractor = await seed.memory.node({
      label: searchToken("Delta"),
      content: distractorBody
    });

    await searchNotes(page, target.label);
    await openSearchMatch(page, target, oldBody);
    await closeNodeRecord(page);
    await searchNotes(page, distractor.label);
    await openSearchMatch(page, distractor, distractorBody);
    await closeNodeRecord(page);
    await searchNotes(page, oldBody);
    await openSearchMatch(page, target, oldBody);

    const editor = page
      .locator('#mdContent > div[id^="md-block-"]')
      .first()
      .locator("[contenteditable]")
      .first();
    await expect(editor).toBeVisible();
    await editor.fill(newBody);
    await expect(editor).toHaveText(newBody);
    await searchNotes(page, newBody);
    await openSearchMatch(page, target, newBody);
    await closeNodeRecord(page);
    await page.reload();
    await ensureInAppOnHome(page);

    await searchNotes(page, oldBody);
    await expectNoSearchMatches(page);
    await searchNotes(page, newBody);
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
      const body = searchToken("Sapphire");
      const node = await seed.memory.node({
        label: searchToken("Journal"),
        content: body
      });
      await searchNotes(page, node.label);
      await openSearchMatch(page, node, body);
      await closeNodeRecord(page);

      const transport = new DatafnSeedTransport(page, testInfo);
      await transport.mutate("node", { operation, id: node.id });
      await searchNotes(page, node.label);
      await expectNoSearchMatches(page);
      await page.reload();
      await ensureInAppOnHome(page);
      for (const query of [node.label, body]) {
        await searchNotes(page, query);
        await expectNoSearchMatches(page);
      }
    });
  }
});
