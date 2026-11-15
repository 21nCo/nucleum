import { render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const { writable } = require("svelte/store") as typeof import("svelte/store");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined
    })
  });
  return {
    account: writable<Record<string, unknown>>({}),
    getAccountDetails: vi.fn(),
    listAccessTokens: vi.fn()
  };
});

vi.mock("@nucleum/client/runtime/account/account.store", () => ({
  default: mocks.account
}));
vi.mock("@nucleum/client/runtime/account/auth", () => ({
  authClient: async () => ({ getAccountDetails: mocks.getAccountDetails }),
  resolveAuthFnSessionMode: () => "cookie",
  shouldUseAuthFnBearerSession: () => false
}));
vi.mock("@nucleum/client/runtime/account/session-token", () => ({
  hasLegacyCloudSession: async () => false
}));
vi.mock("@nucleum/client/runtime/account/access-tokens", async (original) => ({
  ...(await original<
    typeof import("@nucleum/client/runtime/account/access-tokens")
  >()),
  listAccessTokens: mocks.listAccessTokens
}));
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { gotoPath: vi.fn(), toggleSearchParam: vi.fn() }
}));
vi.mock("@nucleum/surfaces/account/account-deletion", () => ({
  accountDeletion: { delete: vi.fn() }
}));
vi.mock("@nucleum/surfaces/account/account-session", () => ({
  accountSession: { refreshPlanData: vi.fn(), signOut: vi.fn() }
}));
vi.mock("@nucleum/shared-state/files/file-upload", () => ({
  fileUpload: { uploadFileV2: vi.fn() }
}));

import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
import AccountSettings from "./AccountSettings.svelte";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AccountSettings access tokens", () => {
  it("shows token management for a signed-in user when account details fail to load", async () => {
    mocks.account.set({ dataMode: UserDataMode.CLOUD });
    mocks.getAccountDetails.mockResolvedValue({
      ok: false,
      error: { code: "AUTHFN_INTERNAL", message: "Account details failed" }
    });
    mocks.listAccessTokens.mockResolvedValue({
      ok: false,
      kind: "failed",
      message: "Could not reach the account service. Try again."
    });

    render(AccountSettings);

    await waitFor(() => expect(mocks.getAccountDetails).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId("access-token-retry")).toBeTruthy()
    );
    expect(screen.getByTestId("access-tokens")).toBeTruthy();
  });

  it("hides token management when nobody is signed in", async () => {
    mocks.account.set({ dataMode: UserDataMode.LOCAL });
    mocks.getAccountDetails.mockResolvedValue({
      ok: false,
      error: { code: "AUTHFN_UNAUTHENTICATED", message: "Sign in" }
    });
    mocks.listAccessTokens.mockResolvedValue({ ok: true, data: [] });

    render(AccountSettings);

    await waitFor(() => expect(mocks.getAccountDetails).toHaveBeenCalled());
    expect(screen.queryByTestId("access-tokens")).toBeNull();
    expect(mocks.listAccessTokens).not.toHaveBeenCalled();
  });
});
