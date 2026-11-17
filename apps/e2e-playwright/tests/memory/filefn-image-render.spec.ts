import { expect, test, type Locator, type Page } from "@playwright/test";
import { ensureInAppOnHome, isCloudAuthModeActive } from "../utils/helpers";
import { getResourceThumbnailByLabel } from "../utils/resource-matrix";
import {
  blockExternalAuthRequests,
  closeNodeRecord,
  openCapture,
  openNodeRecordFromLibrary,
  openNodesLibrary
} from "./memory-test-helpers";

/** A 32 x 32 opaque PNG, so the thumbnail and the original have pixels. */
const IMAGE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR42mM4oaFBU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULABo2YD0ttAhSAAAAAElFTkSuQmCC",
  "base64"
);

type RenderIntent = "thumbnail" | "full";

/**
 * Collects the URLs FileFn's render route returned for each intent, so a
 * test can tell an image FileFn resolved from one rendered from local bytes.
 */
function recordRenderUrls(page: Page) {
  const urls: Record<RenderIntent, string[]> = { thumbnail: [], full: [] };
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (!/\/files\/[^/]+\/render$/.test(url.pathname) || !response.ok()) {
      return;
    }
    const intent = url.searchParams.get("intent");
    if (intent !== "thumbnail" && intent !== "full") return;
    const body = (await response.json().catch(() => null)) as {
      source?: { url?: string };
    } | null;
    if (body?.source?.url) urls[intent].push(body.source.url);
  });
  return urls;
}

/** Waits until the image has decoded a source FileFn resolved for the intent. */
async function expectFileFnImage(
  image: Locator,
  urls: Record<RenderIntent, string[]>,
  intent: RenderIntent
) {
  await expect(image).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(
      () =>
        image.evaluate(
          (element: HTMLImageElement, resolved: string[]) =>
            element.complete &&
            element.naturalWidth > 1 &&
            resolved.some((url) => element.currentSrc.endsWith(url)),
          urls[intent]
        ),
      { message: `${intent} image decoded from FileFn`, timeout: 30_000 }
    )
    .toBe(true);
}

async function expectThumbnailAndFullImage(
  page: Page,
  label: string,
  urls: Record<RenderIntent, string[]>
) {
  await openNodesLibrary(page);
  await expectFileFnImage(
    getResourceThumbnailByLabel(page, label).locator("img.userdata").first(),
    urls,
    "thumbnail"
  );
  await openNodeRecordFromLibrary(page, label);
  await expectFileFnImage(
    page.getByTestId("resource-record-surface").locator("img.userdata").first(),
    urls,
    "full"
  );
  await closeNodeRecord(page);
}

test.describe("memory - FileFn image rendering @creation", () => {
  test.skip(
    !isCloudAuthModeActive(),
    "FileFn uploads need a signed-in cloud account"
  );

  test.beforeEach(async ({ page }) => {
    await blockExternalAuthRequests(page);
  });

  test("an uploaded image shows its FileFn thumbnail in the grid and the full image in the record, also after reload", async ({
    page
  }) => {
    test.setTimeout(180_000);
    const urls = recordRenderUrls(page);
    await ensureInAppOnHome(page);

    const fileName = `e2e-filefn-${Date.now()}.png`;
    await openCapture(page, "command");
    await page
      .locator('[data-value="UPLOAD"]')
      .first()
      .click({ timeout: 5_000 });
    await page
      .locator('input[type="file"][accept*=".png"]')
      .first()
      .setInputFiles({
        name: fileName,
        mimeType: "image/png",
        buffer: IMAGE_PNG
      });
    await expect(page.getByTestId("resource-record-surface")).toBeVisible({
      timeout: 30_000
    });
    await expect(
      page.getByRole("button", { name: fileName, exact: true })
    ).toBeVisible({ timeout: 30_000 });
    await closeNodeRecord(page);

    await expectThumbnailAndFullImage(page, fileName, urls);

    await page.reload();
    await ensureInAppOnHome(page);
    await expectThumbnailAndFullImage(page, fileName, urls);
  });
});
