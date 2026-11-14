import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const { writable } = require("svelte/store") as typeof import("svelte/store");
  return {
    appStore: writable({ product: "memotron" }),
    listAccessTokens: vi.fn(),
    createAccessToken: vi.fn(),
    revokeAccessToken: vi.fn(),
    copyToClipboard: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn()
  };
});

vi.mock("@nucleum/client/runtime/account/access-tokens", async (original) => ({
  ...(await original<
    typeof import("@nucleum/client/runtime/account/access-tokens")
  >()),
  listAccessTokens: mocks.listAccessTokens,
  createAccessToken: mocks.createAccessToken,
  revokeAccessToken: mocks.revokeAccessToken
}));
vi.mock("@nucleum/shared-state/app-context/app.store", () => ({
  appStore: mocks.appStore
}));
vi.mock("@21n/shared-utils/clipboard", () => ({
  copyToClipboard: mocks.copyToClipboard
}));
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts: { success: mocks.toastSuccess, error: mocks.toastError }
}));

import AccessTokensSection from "./AccessTokensSection.svelte";

const existing = {
  id: "key_existing",
  name: "Existing",
  app: "memotron",
  access: "read",
  scopes: ["memotron:read"],
  createdAt: new Date("2026-11-01T00:00:00.000Z"),
  expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  lastUsedAt: null
};
const createdToken = {
  id: "key_new",
  name: "CLI",
  app: "pointron",
  access: "read-write",
  scopes: ["pointron:read", "pointron:write"],
  createdAt: new Date("2026-11-14T00:00:00.000Z"),
  expiresAt: new Date("2099-02-01T00:00:00.000Z"),
  lastUsedAt: new Date("2026-11-14T01:00:00.000Z")
};

function rows() {
  return screen.queryAllByTestId("access-token-row");
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function submitToken(name: string) {
  await fireEvent.click(screen.getByTestId("access-token-create"));
  await fireEvent.input(
    screen
      .getByTestId("access-token-form")
      .querySelector("input") as HTMLInputElement,
    { target: { value: name } }
  );
  await fireEvent.click(screen.getByTestId("access-token-submit"));
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
  });
  mocks.appStore.set({ product: "memotron" });
  mocks.copyToClipboard.mockResolvedValue(undefined);
});

describe("AccessTokensSection", () => {
  it("lists tokens with their app, access and last use", async () => {
    mocks.listAccessTokens.mockResolvedValue({
      ok: true,
      data: [createdToken, existing]
    });

    render(AccessTokensSection);

    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(rows()[0].textContent).toContain("Pointron - Read and write");
    expect(rows()[0].textContent).toContain("Last used");
    expect(rows()[1].textContent).toContain("Memotron - Read");
    expect(rows()[1].textContent).toContain("Never used");
  });

  it("creates a token for the chosen app and shows its secret once", async () => {
    mocks.listAccessTokens
      .mockResolvedValueOnce({ ok: true, data: [existing] })
      .mockResolvedValue({ ok: true, data: [createdToken, existing] });
    mocks.createAccessToken.mockResolvedValue({
      ok: true,
      data: { id: "key_new", secret: "ak_once" }
    });

    render(AccessTokensSection);
    await waitFor(() => expect(rows()).toHaveLength(1));

    await fireEvent.click(screen.getByTestId("access-token-create"));
    const form = screen.getByTestId("access-token-form");
    await fireEvent.input(form.querySelector("input") as HTMLInputElement, {
      target: { value: "CLI" }
    });
    await fireEvent.click(
      form.querySelector('[data-option-value="pointron"]') as HTMLElement
    );
    await fireEvent.click(
      form.querySelector('[data-option-value="read-write"]') as HTMLElement
    );
    await fireEvent.click(
      form.querySelector('[data-option-value="90"]') as HTMLElement
    );
    await fireEvent.click(screen.getByTestId("access-token-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("access-token-secret").textContent).toBe(
        "ak_once"
      )
    );
    expect(mocks.createAccessToken).toHaveBeenCalledWith({
      name: "CLI",
      app: "pointron",
      access: "read-write",
      expiresInDays: 90
    });
    await waitFor(() => expect(rows()).toHaveLength(2));

    await fireEvent.click(screen.getByTestId("access-token-copy"));
    expect(mocks.copyToClipboard).toHaveBeenCalledWith("ak_once");

    await fireEvent.click(screen.getByTestId("access-token-dismiss"));
    expect(screen.queryByTestId("access-token-secret")).toBeNull();
    expect(document.body.textContent).not.toContain("ak_once");
  });

  it("defaults a new token to the current product's app", async () => {
    mocks.appStore.set({ product: "pointron" });
    mocks.listAccessTokens.mockResolvedValue({ ok: true, data: [] });

    render(AccessTokensSection);
    await waitFor(() =>
      expect(screen.getByText("You have no access tokens.")).toBeTruthy()
    );
    await fireEvent.click(screen.getByTestId("access-token-create"));
    await fireEvent.input(
      screen
        .getByTestId("access-token-form")
        .querySelector("input") as HTMLInputElement,
      { target: { value: "x" } }
    );
    mocks.createAccessToken.mockResolvedValue({
      ok: false,
      kind: "failed",
      message: "boom"
    });
    await fireEvent.click(screen.getByTestId("access-token-submit"));

    await waitFor(() => expect(screen.getByText("boom")).toBeTruthy());
    expect(mocks.createAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ app: "pointron", access: "read" })
    );
    expect(screen.queryByTestId("access-token-secret")).toBeNull();
  });

  it("revokes a token only after confirmation and removes it from the list", async () => {
    mocks.listAccessTokens
      .mockResolvedValueOnce({ ok: true, data: [existing] })
      .mockResolvedValue({ ok: true, data: [] });
    mocks.revokeAccessToken.mockResolvedValue({
      ok: true,
      data: { id: "key_existing" }
    });

    render(AccessTokensSection);
    await waitFor(() => expect(rows()).toHaveLength(1));

    await fireEvent.click(screen.getByTestId("access-token-revoke"));
    expect(mocks.revokeAccessToken).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByTestId("access-token-revoke-confirm"));

    await waitFor(() => expect(rows()).toHaveLength(0));
    expect(mocks.revokeAccessToken).toHaveBeenCalledWith("key_existing");
  });

  it("keeps the token listed when revocation fails", async () => {
    mocks.listAccessTokens.mockResolvedValue({ ok: true, data: [existing] });
    mocks.revokeAccessToken.mockResolvedValue({
      ok: false,
      kind: "session",
      message: "Sign in again to manage access tokens."
    });

    render(AccessTokensSection);
    await waitFor(() => expect(rows()).toHaveLength(1));
    await fireEvent.click(screen.getByTestId("access-token-revoke"));
    await fireEvent.click(screen.getByTestId("access-token-revoke-confirm"));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Sign in again to manage access tokens."
      )
    );
    expect(rows()).toHaveLength(1);
  });

  it("explains that a bearer session manages tokens on the web", async () => {
    mocks.listAccessTokens.mockResolvedValue({
      ok: false,
      kind: "unsupported",
      message: "Manage access tokens from the web app."
    });

    render(AccessTokensSection);

    await waitFor(() =>
      expect(
        screen.getByText("Manage access tokens from the web app.")
      ).toBeTruthy()
    );
    expect(screen.queryByTestId("access-token-create")).toBeNull();
  });

  it("keeps a revoked token hidden when an earlier list resolves after a later one", async () => {
    const afterCreate = deferred<unknown>();
    mocks.listAccessTokens
      .mockResolvedValueOnce({ ok: true, data: [existing] })
      .mockReturnValueOnce(afterCreate.promise)
      .mockResolvedValue({ ok: true, data: [createdToken] });
    mocks.createAccessToken.mockResolvedValue({
      ok: true,
      data: { id: "key_new", secret: "ak_once" }
    });
    mocks.revokeAccessToken.mockResolvedValue({
      ok: true,
      data: { id: "key_existing" }
    });

    render(AccessTokensSection);
    await waitFor(() => expect(rows()).toHaveLength(1));
    await submitToken("CLI");
    await waitFor(() =>
      expect(screen.getByTestId("access-token-secret")).toBeTruthy()
    );
    await waitFor(() =>
      expect(mocks.listAccessTokens).toHaveBeenCalledTimes(2)
    );

    await fireEvent.click(screen.getByTestId("access-token-revoke"));
    await fireEvent.click(screen.getByTestId("access-token-revoke-confirm"));
    await waitFor(() =>
      expect(mocks.listAccessTokens).toHaveBeenCalledTimes(3)
    );
    await waitFor(() =>
      expect(rows().map((row) => row.dataset.tokenId)).toEqual(["key_new"])
    );

    afterCreate.resolve({ ok: true, data: [createdToken, existing] });
    await afterCreate.promise;
    await tick();
    expect(rows().map((row) => row.dataset.tokenId)).toEqual(["key_new"]);
  });

  it("keeps a created token visible when the initial list resolves late", async () => {
    const initial = deferred<unknown>();
    mocks.listAccessTokens
      .mockReturnValueOnce(initial.promise)
      .mockResolvedValue({ ok: true, data: [createdToken] });
    mocks.createAccessToken.mockResolvedValue({
      ok: true,
      data: { id: "key_new", secret: "ak_once" }
    });

    render(AccessTokensSection);
    await submitToken("CLI");
    await waitFor(() => expect(rows()).toHaveLength(1));

    initial.resolve({ ok: true, data: [] });
    await initial.promise;
    await tick();
    expect(rows().map((row) => row.dataset.tokenId)).toEqual(["key_new"]);
  });

  it("offers a retry after the list fails to load", async () => {
    mocks.listAccessTokens
      .mockResolvedValueOnce({
        ok: false,
        kind: "failed",
        message: "Could not reach the account service. Try again."
      })
      .mockResolvedValue({ ok: true, data: [existing] });

    render(AccessTokensSection);
    await waitFor(() =>
      expect(screen.getByTestId("access-token-retry")).toBeTruthy()
    );
    expect(screen.queryByTestId("access-token-create")).toBeNull();

    await fireEvent.click(screen.getByTestId("access-token-retry"));

    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.queryByTestId("access-token-retry")).toBeNull();
    expect(screen.getByTestId("access-token-create")).toBeTruthy();
  });

  it("moves focus to the confirm control and back when revoking is cancelled", async () => {
    mocks.listAccessTokens.mockResolvedValue({ ok: true, data: [existing] });

    render(AccessTokensSection);
    await waitFor(() => expect(rows()).toHaveLength(1));

    await fireEvent.click(screen.getByTestId("access-token-revoke"));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByTestId("access-token-revoke-confirm")
      )
    );

    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByTestId("access-token-revoke")
      )
    );
    expect(mocks.revokeAccessToken).not.toHaveBeenCalled();
  });
});
