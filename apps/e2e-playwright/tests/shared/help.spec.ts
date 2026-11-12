import { expect, test } from "@playwright/test";
import {
  ensureInAppOnHome,
  readToastNotificationContent
} from "../utils/helpers";

test.describe("help center", () => {
  test("Troubleshoot copies diagnostic information and confirms with a toast", async ({
    page,
    context
  }) => {
    test.setTimeout(90_000);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureInAppOnHome(page);

    await page.getByTestId("app-menu-help").click();
    await expect(page.getByText("Help center", { exact: true })).toBeVisible();

    await page.getByText("Troubleshoot", { exact: true }).first().click();
    const troubleshoot = page.getByTestId("troubleshoot");
    await expect(troubleshoot).toBeVisible();
    await expect(
      troubleshoot.getByTestId("send-diagnostic-information")
    ).toBeVisible();

    await troubleshoot.getByTestId("copy-diagnostic-information").click();
    await readToastNotificationContent(page, {
      expectedContent: "Diagnostic information copied to the clipboard"
    });

    const report = await page.evaluate(() => navigator.clipboard.readText());
    expect(report).toContain("Diagnostic information (");
    for (const section of ["## App", "## Device", "## Sync", "## Appearance"]) {
      expect(report).toContain(section);
    }
    expect(report).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);

    await page
      .getByTestId("modal-help")
      .getByRole("button", { name: /^Back$/ })
      .click();
    await expect(troubleshoot).toBeHidden();
    await expect(page.getByText("Help center", { exact: true })).toBeVisible();
  });
});
