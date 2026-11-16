import { expect, test } from "@playwright/test";
import {
  ensureInAppOnHome,
  readToastNotificationContent
} from "../../utils/helpers";
import { openSettings } from "../../utils/settings";

test.describe("settings - backup @settings", () => {
  test("Backup downloads a file and reports progress and success with toasts", async ({
    page
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureInAppOnHome(page);

    await openSettings(page);
    await page
      .getByTestId("settings-sidebar")
      .getByRole("button", { name: /^Data Settings$/i })
      .click({ timeout: 5_000 });

    const backup = page.getByRole("button", { name: /^Backup$/ });
    await expect(backup).toBeVisible();
    test.skip(
      await backup.isDisabled(),
      "Backup is unavailable without local DataFn storage"
    );

    const download = page.waitForEvent("download");
    await backup.click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/-backup-.*\.json$/);
    await readToastNotificationContent(page, {
      expectedContent: `Backup downloaded as ${file.suggestedFilename()}`
    });
    await expect(page.getByTestId("settings-sidebar")).toBeVisible();
  });
});
