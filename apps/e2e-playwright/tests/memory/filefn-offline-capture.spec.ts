import { expect, test, type Locator, type Page } from "@playwright/test";
import { isE2ECloudOnlyAuthMode } from "../../config/auth-mode";
import {
  ensureInAppOnHome,
  getE2EAuthMode,
  isCloudAuthModeActive
} from "../utils/helpers";
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

/** Uploads an image through capture and waits for its record to open. */
async function captureImage(page: Page, fileName: string) {
  await openCapture(page, "command");
  await page.locator('[data-value="UPLOAD"]').first().click({ timeout: 5_000 });
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
}

/** Waits until the image has decoded a source the predicate accepts. */
async function expectImageFrom(
  image: Locator,
  isExpectedSource: (source: string) => boolean,
  message: string
) {
  await expect(image).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(
      async () => {
        const source = await image.evaluate((element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 1 ? element.currentSrc : ""
        );
        return Boolean(source) && isExpectedSource(source);
      },
      { message, timeout: 30_000 }
    )
    .toBe(true);
}

async function expectGridAndRecordImage(
  page: Page,
  label: string,
  isExpectedSource: (source: string) => boolean,
  message: string
) {
  await openNodesLibrary(page);
  await expectImageFrom(
    getResourceThumbnailByLabel(page, label).locator("img.userdata").first(),
    isExpectedSource,
    `grid ${message}`
  );
  await openNodeRecordFromLibrary(page, label);
  await expectImageFrom(
    page.getByTestId("resource-record-surface").locator("img.userdata").first(),
    isExpectedSource,
    `record ${message}`
  );
  await closeNodeRecord(page);
}

const isDeviceSource = (source: string) => source.startsWith("blob:");

/** Counts the files waiting in the page's FileFn OPFS queues. */
function countQueuedFiles(page: Page) {
  return page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    let count = 0;
    for await (const [name, handle] of (
      root as unknown as {
        entries(): AsyncIterable<[string, FileSystemHandle]>;
      }
    ).entries()) {
      if (
        !name.startsWith("nucleum-file-queue") ||
        handle.kind !== "directory"
      ) {
        continue;
      }
      for await (const _ of (
        handle as unknown as { keys(): AsyncIterable<string> }
      ).keys()) {
        count += 1;
      }
    }
    return count;
  });
}

/** Collects the source URLs FileFn's render route returned. */
function recordRenderUrls(page: Page) {
  const urls: string[] = [];
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (!/\/files\/[^/]+\/render$/.test(url.pathname) || !response.ok()) {
      return;
    }
    type Descriptor = { source?: { url?: string } };
    const body = (await response.json().catch(() => null)) as
      (Descriptor & { data?: Descriptor }) | null;
    const sourceUrl = body?.data?.source?.url ?? body?.source?.url;
    if (sourceUrl) urls.push(sourceUrl);
  });
  return urls;
}

test.describe("memory - files kept on the device until they upload @creation", () => {
  test.beforeEach(async ({ page }) => {
    await blockExternalAuthRequests(page);
  });

  test("a local-only user's image shows from the device, also after reload", async ({
    page
  }) => {
    test.skip(
      isCloudAuthModeActive(),
      "A local-only user keeps files on the device"
    );
    test.setTimeout(180_000);
    await ensureInAppOnHome(page);
    const fileName = `e2e-local-${Date.now()}.png`;

    await captureImage(page, fileName);
    await closeNodeRecord(page);
    await expectGridAndRecordImage(
      page,
      fileName,
      isDeviceSource,
      "image from the device"
    );

    await page.reload();
    await ensureInAppOnHome(page);
    await expectGridAndRecordImage(
      page,
      fileName,
      isDeviceSource,
      "image from the device after reload"
    );
  });

  test("an image captured offline uploads once online and shows from FileFn after reload", async ({
    page,
    context
  }) => {
    test.skip(
      !isCloudAuthModeActive() || isE2ECloudOnlyAuthMode(getE2EAuthMode()),
      "Uploading an offline capture needs a cloud account with offline storage"
    );
    test.setTimeout(240_000);
    await page.addInitScript(() =>
      window.localStorage.setItem("datafnOfflinability", "true")
    );
    const renderUrls = recordRenderUrls(page);
    await ensureInAppOnHome(page);
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem("datafnOfflinability")
      )
    ).toBe("true");
    const fileName = `e2e-offline-${Date.now()}.png`;

    await context.setOffline(true);
    await captureImage(page, fileName);
    await expectImageFrom(
      page
        .getByTestId("resource-record-surface")
        .locator("img.userdata")
        .first(),
      isDeviceSource,
      "offline capture shows from the device"
    );
    await closeNodeRecord(page);
    expect(await countQueuedFiles(page)).toBeGreaterThan(0);

    const uploaded = page.waitForResponse(
      (response) =>
        /\/files\/upload\/[^/]+\/complete$/.test(
          new URL(response.url()).pathname
        ) && response.ok(),
      { timeout: 60_000 }
    );
    await context.setOffline(false);
    await uploaded;
    await expect
      .poll(() => countQueuedFiles(page), {
        message: "the upload leaves the device queue",
        timeout: 60_000
      })
      .toBe(0);

    await page.reload();
    await ensureInAppOnHome(page);
    await expectGridAndRecordImage(
      page,
      fileName,
      (source) => renderUrls.some((url) => source.endsWith(url)),
      "image FileFn resolved after the upload"
    );
  });
});
