import {
  expect,
  request as apiRequest,
  test,
  type Locator,
  type Page
} from "@playwright/test";
import { Product } from "@nucleum/client/config/product.type";
import { ensureInAppOnHome, isCloudAuthModeActive } from "../../utils/helpers";
import { openSettings } from "../../utils/settings";

const projectApps: Record<string, { app: string; resource: string }> = {
  [Product.NUCLEUM]: { app: "Nucleum", resource: "node" },
  [Product.MEMOTRON]: { app: "Memotron", resource: "node" },
  [Product.POINTRON]: { app: "Pointron", resource: "objective" }
};

async function openAccessTokens(page: Page): Promise<Locator> {
  await ensureInAppOnHome(page);
  await openSettings(page);
  await page
    .getByTestId("settings-sidebar")
    .getByTestId("account-profile-section")
    .click();
  const section = page.getByTestId("access-tokens");
  await expect(section).toBeVisible({ timeout: 20_000 });
  await expect(section.getByText("Loading access tokens...")).toBeHidden({
    timeout: 20_000
  });
  return section;
}

function tokenRow(section: Locator, name: string) {
  return section.getByTestId("access-token-row").filter({ hasText: name });
}

/**
 * Sends one DataFn query with only the access token, from a request context
 * that carries no browser cookies, so the token alone authenticates it.
 */
async function queryWithToken(
  accountBaseUrl: string,
  secret: string,
  resource: string
) {
  const context = await apiRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    const response = await context.post(`${accountBaseUrl}/datafn/query`, {
      headers: { authorization: `Bearer ${secret}` },
      data: { resource, version: 1 }
    });
    return { status: response.status(), body: await response.json() };
  } finally {
    await context.dispose();
  }
}

test.describe("settings - personal access tokens @settings @auth", () => {
  test.skip(
    !isCloudAuthModeActive(),
    "Access tokens need a signed-in AuthFn web session"
  );

  test("create a token, call the API with it, revoke it and see it gone after reload", async ({
    page
  }, testInfo) => {
    test.setTimeout(180_000);
    const target = projectApps[testInfo.project.name];
    expect(target, "project maps to an app").toBeTruthy();
    const name = `e2e token ${Date.now()}`;

    let section = await openAccessTokens(page);
    await section.getByTestId("access-token-create").click();
    const form = section.getByTestId("access-token-form");
    await expect(form).toBeVisible();
    await form.getByPlaceholder("What is this token for?").fill(name);
    await form.getByRole("button", { name: target.app, exact: true }).click();
    await form.getByRole("button", { name: "Read", exact: true }).click();
    await form.getByRole("button", { name: "7 days", exact: true }).click();

    const createResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith("/auth/api-keys")
    );
    await section.getByTestId("access-token-submit").click();
    const created = await createResponse;
    expect(created.status()).toBe(201);
    const accountBaseUrl = created.url().replace(/\/auth\/api-keys$/, "");

    const secret = section.getByTestId("access-token-secret");
    await expect(secret).toBeVisible();
    const secretValue = (await secret.textContent())?.trim() ?? "";
    expect(secretValue.length).toBeGreaterThan(20);
    const row = tokenRow(section, name);
    await expect(row).toBeVisible();
    await expect(row).toContainText(`${target.app} - Read`);
    await expect(row).toContainText("Never used");

    const allowed = await queryWithToken(
      accountBaseUrl,
      secretValue,
      target.resource
    );
    expect(allowed.status, JSON.stringify(allowed.body)).toBe(200);

    await section.getByTestId("access-token-dismiss").click();
    await expect(secret).toBeHidden();

    await page.reload();
    section = await openAccessTokens(page);
    await expect(section.getByTestId("access-token-secret")).toBeHidden();
    await expect(tokenRow(section, name)).toContainText("Last used");

    await tokenRow(section, name).getByTestId("access-token-revoke").click();
    await tokenRow(section, name)
      .getByTestId("access-token-revoke-confirm")
      .click();
    await expect(tokenRow(section, name)).toHaveCount(0);

    const denied = await queryWithToken(
      accountBaseUrl,
      secretValue,
      target.resource
    );
    expect([401, 403]).toContain(denied.status);

    await page.reload();
    section = await openAccessTokens(page);
    await expect(tokenRow(section, name)).toHaveCount(0);
  });
});
