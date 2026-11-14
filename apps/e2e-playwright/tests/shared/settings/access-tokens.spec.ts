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
 *
 * Interim evidence: TIDY-581 acceptance asks for a call to `/v1` with the
 * token, but the versioned public REST API does not exist until TIDY-584, so
 * that call is deferred to TIDY-584 and this DataFn query stands in for it.
 * It is not evidence that `/v1` accepts the token. A revoked token currently
 * gets a 500 from `/datafn` (its context does not map the revoked-key error),
 * recorded on TIDY-592, so the refusal check only asserts a non-ok response.
 */
async function queryWithToken(
  accountBaseUrl: string,
  secret: string,
  resource: string
) {
  const context = await apiRequest.newContext({
    ignoreHTTPSErrors: true,
    storageState: { cookies: [], origins: [] }
  });
  try {
    const response = await context.post(`${accountBaseUrl}/datafn/query`, {
      headers: { authorization: `Bearer ${secret}` },
      data: { resource, version: 1 }
    });
    return {
      status: response.status(),
      body: await response.json().catch(() => null)
    };
  } finally {
    await context.dispose();
  }
}

/**
 * Revokes a token through the account service with the page's cookie session,
 * so a failed run does not leave a live token behind.
 */
async function revokeTokenDirectly(
  page: Page,
  accountBaseUrl: string,
  keyId: string
) {
  const cookies = await page.context().cookies(accountBaseUrl);
  const csrf = cookies.find((cookie) => cookie.name.endsWith(".csrf"))?.value;
  await page.request
    .delete(`${accountBaseUrl}/auth/api-keys/${encodeURIComponent(keyId)}`, {
      headers: csrf ? { "x-authfn-csrf": csrf } : {}
    })
    .catch(() => undefined);
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
    let accountBaseUrl: string | undefined;
    let keyId: string | undefined;
    let revoked = false;

    try {
      let section = await openAccessTokens(page);
      await section.getByTestId("access-token-create").click();
      const form = section.getByTestId("access-token-form");
      await expect(form).toBeVisible();
      const nameInput = form.getByPlaceholder("What is this token for?");
      await expect(nameInput).toBeFocused();
      await nameInput.fill(name);
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
      accountBaseUrl = created.url().replace(/\/auth\/api-keys$/, "");
      const createdBody = (await created.json().catch(() => null)) as {
        data?: { keyId?: string };
      } | null;
      keyId = createdBody?.data?.keyId;
      expect(keyId, "the created key id is known for cleanup").toBeTruthy();

      const secret = section.getByTestId("access-token-secret");
      await expect(secret).toBeVisible();
      await expect(section.getByTestId("access-token-copy")).toBeFocused();
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
      expect(allowed.body?.ok).toBe(true);

      await section.getByTestId("access-token-dismiss").click();
      await expect(secret).toBeHidden();
      await expect(section.getByTestId("access-token-create")).toBeFocused();

      await page.reload();
      section = await openAccessTokens(page);
      await expect(section.getByTestId("access-token-secret")).toBeHidden();
      await expect(tokenRow(section, name)).toContainText("Last used");

      await tokenRow(section, name).getByTestId("access-token-revoke").click();
      const confirmRevoke = tokenRow(section, name).getByTestId(
        "access-token-revoke-confirm"
      );
      await expect(confirmRevoke).toBeFocused();
      await confirmRevoke.click();
      await expect(tokenRow(section, name)).toHaveCount(0);
      revoked = true;
      await expect(
        section.locator(":focus"),
        "focus stays in the section after the row goes"
      ).toHaveCount(1);

      const denied = await queryWithToken(
        accountBaseUrl,
        secretValue,
        target.resource
      );
      expect(
        denied.status,
        "a revoked token no longer reaches DataFn"
      ).toBeGreaterThanOrEqual(400);
      expect(denied.body?.ok).not.toBe(true);

      await page.reload();
      section = await openAccessTokens(page);
      await expect(tokenRow(section, name)).toHaveCount(0);
    } finally {
      if (!revoked && accountBaseUrl && keyId) {
        await revokeTokenDirectly(page, accountBaseUrl, keyId);
      }
    }
  });
});
