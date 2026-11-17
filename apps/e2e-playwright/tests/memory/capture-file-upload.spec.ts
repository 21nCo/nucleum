import { expect, test, type Page } from "@playwright/test";
import { ensureInAppOnHome } from "../utils/helpers";
import { getResourceThumbnailByLabel } from "../utils/resource-matrix";
import {
  blockExternalAuthRequests,
  closeNodeRecord,
  openCapture,
  openNodesLibrary
} from "./memory-test-helpers";

/** A 32 x 32 opaque PNG, so the device thumbnail has pixels to render. */
const IMAGE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR42mM4oaFBU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULABo2YD0ttAhSAAAAAElFTkSuQmCC",
  "base64"
);

/**
 * Waits until the named node's Library thumbnail shows the decoded thumbnail,
 * not FileView's 1 x 1 GIF loading placeholder.
 */
async function expectImageThumbnail(page: Page, label: string) {
  const image = getResourceThumbnailByLabel(page, label).locator("img").first();
  await expect(image).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(
      () =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete &&
            element.naturalWidth > 1 &&
            !element.currentSrc.startsWith("data:image/gif")
        ),
      { message: "thumbnail image decoded", timeout: 20_000 }
    )
    .toBe(true);
}

test.describe("memory - capture file upload @creation", () => {
  test.beforeEach(async ({ page }) => {
    await blockExternalAuthRequests(page);
  });

  test("upload an image in Capture, see its thumbnail, reload and see it again", async ({
    page
  }) => {
    test.setTimeout(120_000);
    await ensureInAppOnHome(page);

    const fileName = `e2e-upload-${Date.now()}.png`;
    await openCapture(page, "command");
    await page.locator('[data-value="UPLOAD"]').first().click({ timeout: 5_000 });
    await page
      .locator('input[type="file"][accept*=".png"]')
      .first()
      .setInputFiles({ name: fileName, mimeType: "image/png", buffer: IMAGE_PNG });

    await expect(page.getByTestId("resource-record-surface")).toBeVisible({
      timeout: 30_000
    });
    await expect(
      page.getByRole("button", { name: fileName, exact: true })
    ).toBeVisible({ timeout: 20_000 });
    await closeNodeRecord(page);
    await openNodesLibrary(page);
    await expectImageThumbnail(page, fileName);

    await page.reload();
    await ensureInAppOnHome(page);
    await openNodesLibrary(page);
    await expectImageThumbnail(page, fileName);
  });
});
