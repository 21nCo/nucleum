import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const { writable } = require("svelte/store") as typeof import("svelte/store");
  return {
    appearanceProfiles: writable({
      profiles: [] as unknown[],
      applied: undefined as unknown,
      isModified: false
    }),
    menus: new Map<string, any>(),
    saveAppearanceProfileAsNew: vi.fn(),
    renameAppearanceProfile: vi.fn(),
    toastError: vi.fn()
  };
});

vi.mock("@nucleum/shared-state/appearance/appearance-profiles", () => ({
  appearanceProfiles: mocks.appearanceProfiles,
  applyAppearanceProfile: vi.fn(),
  deleteAppearanceProfile: vi.fn(),
  renameAppearanceProfile: mocks.renameAppearanceProfile,
  saveAppearanceProfileAsNew: mocks.saveAppearanceProfileAsNew,
  updateAppearanceProfile: vi.fn()
}));
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts: { error: mocks.toastError }
}));
vi.mock("@21n/ui/actions/popover.action", () => ({
  popover: (_node: HTMLElement, params: { id: string }) => {
    mocks.menus.set(params.id, params);
    return {
      update: (next: { id: string }) => mocks.menus.set(next.id, next),
      destroy: () => undefined
    };
  }
}));

import {
  PROFILE_NAME_MISSING_MESSAGE,
  PROFILE_NAME_SAVE_FAILED_MESSAGE
} from "./appearance-profile-name-write";
import AppearanceProfiles from "./AppearanceProfiles.svelte";

const night = {
  id: "night",
  name: "Night",
  settings: {
    isSyncWithSystem: true,
    lightColorSchemeId: "1",
    darkColorSchemeId: "2",
    userThemeSetting: "light",
    appStyle: "boxed",
    typeface: "Sen"
  },
  isBuiltIn: false,
  createdAt: 1
};

function nameInput() {
  return screen.queryByTestId(
    "appearance-profile-name"
  ) as HTMLInputElement | null;
}

async function typeName(value: string) {
  const input = nameInput();
  expect(input).not.toBeNull();
  await fireEvent.input(input!, { target: { value } });
  await tick();
}

async function save() {
  await fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

async function openNewEditor() {
  await fireEvent.click(screen.getByTestId("appearance-profile-save-new"));
  await tick();
}

async function openRenameEditor() {
  const menu = mocks.menus.get("appearance-profile-menu-night");
  const rename = menu.componentProps
    .menuResolver()[0]
    .items.find((item: { value: string }) => item.value === "rename");
  await rename.callback();
  await tick();
}

describe("AppearanceProfiles name editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.menus.clear();
    mocks.appearanceProfiles.set({
      profiles: [night],
      applied: night,
      isModified: false
    });
  });

  it("gives the editor's save and cancel controls accessible names", async () => {
    render(AppearanceProfiles);
    await openNewEditor();
    await typeName("Work");

    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it.each([
    ["rejects", () => Promise.reject(new Error("offline"))],
    ["returns ok=false", () => Promise.resolve({ ok: false, error: "denied" })]
  ])(
    "keeps a new profile name for retry when the write %s",
    async (_label, failingWrite) => {
      mocks.saveAppearanceProfileAsNew
        .mockImplementationOnce(failingWrite)
        .mockResolvedValueOnce({ ok: true, key: "globalPreferences" });
      render(AppearanceProfiles);
      await openNewEditor();
      await typeName("Work");

      await save();
      await waitFor(() =>
        expect(mocks.toastError).toHaveBeenCalledWith(
          PROFILE_NAME_SAVE_FAILED_MESSAGE
        )
      );
      expect(nameInput()?.value).toBe("Work");

      await save();
      await waitFor(() => expect(nameInput()).toBeNull());
      expect(mocks.saveAppearanceProfileAsNew).toHaveBeenNthCalledWith(
        1,
        "Work"
      );
      expect(mocks.saveAppearanceProfileAsNew).toHaveBeenNthCalledWith(
        2,
        "Work"
      );
      expect(mocks.toastError).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    ["rejects", () => Promise.reject(new Error("offline"))],
    ["returns ok=false", () => Promise.resolve({ ok: false, error: "denied" })]
  ])(
    "keeps a renamed profile name for retry when the write %s",
    async (_label, failingWrite) => {
      mocks.renameAppearanceProfile
        .mockImplementationOnce(failingWrite)
        .mockResolvedValueOnce({ ok: true, key: "globalPreferences" });
      render(AppearanceProfiles);
      await openRenameEditor();
      await typeName("Late night");

      await save();
      await waitFor(() =>
        expect(mocks.toastError).toHaveBeenCalledWith(
          PROFILE_NAME_SAVE_FAILED_MESSAGE
        )
      );
      expect(nameInput()?.value).toBe("Late night");

      await save();
      await waitFor(() => expect(nameInput()).toBeNull());
      expect(mocks.renameAppearanceProfile).toHaveBeenNthCalledWith(
        1,
        "night",
        "Late night"
      );
      expect(mocks.renameAppearanceProfile).toHaveBeenNthCalledWith(
        2,
        "night",
        "Late night"
      );
      expect(mocks.toastError).toHaveBeenCalledTimes(1);
    }
  );

  it("closes the rename editor and reports a profile that no longer exists", async () => {
    mocks.renameAppearanceProfile.mockReturnValueOnce(undefined);
    render(AppearanceProfiles);
    await openRenameEditor();
    await typeName("Late night");

    await save();
    await waitFor(() => expect(nameInput()).toBeNull());
    expect(mocks.toastError).toHaveBeenCalledWith(PROFILE_NAME_MISSING_MESSAGE);
  });

  it("closes the editor without an error after a successful write", async () => {
    mocks.saveAppearanceProfileAsNew.mockResolvedValueOnce({
      ok: true,
      key: "globalPreferences"
    });
    render(AppearanceProfiles);
    await openNewEditor();
    await typeName("Work");

    await save();
    await waitFor(() => expect(nameInput()).toBeNull());
    expect(mocks.toastError).not.toHaveBeenCalled();
  });
});
