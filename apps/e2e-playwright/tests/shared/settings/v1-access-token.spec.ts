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

/** The app each project's token is for and the `/v1` list it reads. */
const projectApps: Record<string, { label: string; path: string }> = {
  [Product.NUCLEUM]: { label: "Nucleum", path: "/v1/nucleum/nodes" },
  [Product.MEMOTRON]: { label: "Memotron", path: "/v1/memotron/nodes" },
  [Product.POINTRON]: { label: "Pointron", path: "/v1/pointron/objectives" }
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
 * Calls the app's `/v1` list with only the token, from a request context
 * without the browser's cookies, so the token alone authenticates it.
 */
async function listWithToken(accountBaseUrl: string, secret: string, path: string) {
  const context = await apiRequest.newContext({
    ignoreHTTPSErrors: true,
    storageState: { cookies: [], origins: [] }
  });
  try {
    const response = await context.get(`${accountBaseUrl}${path}?limit=1`, {
      headers: { authorization: `Bearer ${secret}` }
    });
    return {
      status: response.status(),
      contentType: response.headers()["content-type"] ?? "",
      body: (await response.json().catch(() => null)) as Record<string, unknown> | null
    };
  } finally {
    await context.dispose();
  }
}

/** Revokes the token with the page's cookie session after a failed run. */
async function revokeDirectly(page: Page, accountBaseUrl: string, keyId: string) {
  const cookies = await page.context().cookies(accountBaseUrl);
  const csrf = cookies.find((cookie) => cookie.name.endsWith(".csrf"))?.value;
  const response = await page.request
    .delete(`${accountBaseUrl}/auth/api-keys/${encodeURIComponent(keyId)}`, {
      headers: csrf ? { "x-authfn-csrf": csrf } : {}
    })
    .catch(() => null);
  return response?.ok() ?? false;
}

test.describe("settings - personal access token on the v1 API @settings @auth", () => {
  test.skip(
    !isCloudAuthModeActive(),
    "Access tokens need a signed-in AuthFn web session"
  );

  test("create a token, call /v1 with it, revoke it, see the call refused and the token gone after reload", async ({
    page
  }, testInfo) => {
    test.setTimeout(180_000);
    const target = projectApps[testInfo.project.name];
    expect(target, "project maps to an app").toBeTruthy();
    const name = `e2e v1 token ${Date.now()}`;
    let accountBaseUrl: string | undefined;
    let keyId: string | undefined;
    let revoked = false;

    try {
      let section = await openAccessTokens(page);
      await section.getByTestId("access-token-create").click();
      const form = section.getByTestId("access-token-form");
      await expect(form).toBeVisible();
      await form.getByPlaceholder("What is this token for?").fill(name);
      await form.getByRole("button", { name: target.label, exact: true }).click();
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
      const secretValue = (await secret.textContent())?.trim() ?? "";
      expect(secretValue.length).toBeGreaterThan(20);
      await expect(tokenRow(section, name)).toContainText(`${target.label} - Read`);

      const allowed = await listWithToken(accountBaseUrl, secretValue, target.path);
      expect(allowed.status, JSON.stringify(allowed.body)).toBe(200);
      expect(Array.isArray(allowed.body?.data)).toBe(true);
      expect(allowed.body).toHaveProperty("nextCursor");

      await section.getByTestId("access-token-dismiss").click();
      await tokenRow(section, name).getByTestId("access-token-revoke").click();
      await tokenRow(section, name).getByTestId("access-token-revoke-confirm").click();
      await expect(tokenRow(section, name)).toHaveCount(0);
      revoked = true;

      const refused = await listWithToken(accountBaseUrl, secretValue, target.path);
      expect(refused.status, JSON.stringify(refused.body)).toBe(401);
      expect(refused.contentType).toContain("application/problem+json");
      expect(refused.body).toMatchObject({ status: 401, code: "unauthenticated" });

      // The section also shows no rows when its list fails to load, so the
      // token counts as gone only once the reloaded list arrived intact.
      const reloadedList = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          new URL(response.url()).pathname.endsWith("/auth/api-keys"),
        { timeout: 60_000 }
      );
      await page.reload();
      section = await openAccessTokens(page);
      const listed = await reloadedList;
      expect(listed.status()).toBe(200);
      const listedBody = (await listed.json()) as {
        data?: { keys?: Array<Record<string, unknown>> };
      };
      const keys = listedBody.data?.keys;
      expect(Array.isArray(keys), "the reloaded token list loaded").toBe(true);
      // The list may still carry the key marked revoked; the section hides it.
      const listedKey = keys?.find((key) => key.keyId === keyId || key.id === keyId);
      expect(listedKey === undefined || Boolean(listedKey.revokedAt)).toBe(true);
      // The create button shows only while the list has no load error.
      await expect(section.getByTestId("access-token-retry")).toHaveCount(0);
      await expect(section.getByTestId("access-token-create")).toBeVisible();
      await expect(tokenRow(section, name)).toHaveCount(0);
    } finally {
      if (!revoked && accountBaseUrl && keyId) {
        const cleaned = await revokeDirectly(page, accountBaseUrl, keyId);
        if (!cleaned) {
          testInfo.annotations.push({
            type: "cleanup-failed",
            description: `Cleanup could not revoke access token ${keyId}; it stays active until it expires`
          });
        }
      }
    }
  });
});
