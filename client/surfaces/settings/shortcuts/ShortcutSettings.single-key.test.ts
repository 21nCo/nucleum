import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Embed, OperatingSystem } from "@nucleum/client/runtime/context.type";

const mocks = vi.hoisted(() => ({
  merge: vi.fn(async () => ({ ok: true })),
  set: vi.fn(async () => ({ ok: true })),
  context: undefined as
    | undefined
    | import("svelte/store").Writable<Record<string, unknown>>
}));

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: {
    currentNamespace: () => "test-namespace",
    kv: {
      signal: () => ({
        subscribe: (fn: (value: object) => void) => {
          fn({});
          return () => {};
        },
        get: () => ({}),
        dispose: vi.fn()
      }),
      merge: mocks.merge,
      set: mocks.set
    }
  }
}));
vi.mock("@nucleum/shared-state/preferences/timezone.store", () => ({
  tzStore: {
    setTimezone: vi.fn(),
    resolveTimezone: () => "UTC",
    destroy: vi.fn()
  }
}));
vi.mock("@nucleum/client/runtime/context.store", async () => {
  const { writable: store } = await import("svelte/store");
  mocks.context = store<Record<string, unknown>>({});
  return { default: mocks.context };
});
vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({ runAction: vi.fn(), resolveAction: () => null })
}));
vi.mock("@21n/ui/elements/markdown/markdown.utils", () => ({
  renderMdAsHtml: (value: string) => value
}));

import { Resource } from "@nucleum/datafn/resource.enum";
import { configureShortcutHost } from "@nucleum/shared-state/shortcuts/shortcut-host";
import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";
import { readSingleKeyShortcutsEnabled } from "@nucleum/shared-state/preferences/single-key-shortcuts";
import ShortcutSettings from "./ShortcutSettings.svelte";

function singleKeySwitch(container: HTMLElement) {
  return container.querySelector<HTMLInputElement>(
    '[data-testid="toggle-single-key-shortcuts"] input[type="checkbox"]'
  );
}

describe("the single-key shortcuts preference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    void userPreferences.loader({});
  });

  it("defaults to on, also for preferences saved before it existed", () => {
    expect(userPreferences.seed.isSingleKeyShortcutsEnabled).toBe(true);
    expect(userPreferences.get().isSingleKeyShortcutsEnabled).toBe(true);
    expect(readSingleKeyShortcutsEnabled()).toBe(true);
  });

  it("follows the stored preference", () => {
    void userPreferences.loader({ isSingleKeyShortcutsEnabled: false });

    expect(userPreferences.get().isSingleKeyShortcutsEnabled).toBe(false);
    expect(readSingleKeyShortcutsEnabled()).toBe(false);
  });

  it("is saved through the user preferences store", async () => {
    await userPreferences.setSingleKeyShortcutsEnabled(false);

    expect(mocks.merge).toHaveBeenCalledWith(Resource.globalPreferences, {
      isSingleKeyShortcutsEnabled: false
    });
    expect(userPreferences.get().isSingleKeyShortcutsEnabled).toBe(false);
    expect(readSingleKeyShortcutsEnabled()).toBe(false);
  });
});

describe("the Single-key shortcuts switch in Shortcuts settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context?.set({ os: OperatingSystem.MACOS });
    configureShortcutHost({ defaults: {}, configurableActions: () => [] });
    void userPreferences.loader({});
  });

  it("shows on at the top of the settings and turns the preference off", async () => {
    const { container, getByText } = render(ShortcutSettings);
    const input = singleKeySwitch(container);

    expect(getByText("Single-key shortcuts")).toBeTruthy();
    const settings = container.querySelector(
      '[data-testid="keyboard-shortcut-settings"]'
    );
    expect(settings?.firstElementChild?.getAttribute("data-testid")).toBe(
      "toggle-single-key-shortcuts"
    );
    expect(input?.checked).toBe(true);

    await fireEvent.click(input!);

    expect(mocks.merge).toHaveBeenCalledWith(Resource.globalPreferences, {
      isSingleKeyShortcutsEnabled: false
    });
    expect(readSingleKeyShortcutsEnabled()).toBe(false);
    await waitFor(() => expect(singleKeySwitch(container)?.checked).toBe(false));
  });

  it("reads a stored off preference and turns it on again", async () => {
    void userPreferences.loader({ isSingleKeyShortcutsEnabled: false });
    const { container } = render(ShortcutSettings);

    expect(singleKeySwitch(container)?.checked).toBe(false);
    await fireEvent.click(singleKeySwitch(container)!);

    expect(mocks.merge).toHaveBeenCalledWith(Resource.globalPreferences, {
      isSingleKeyShortcutsEnabled: true
    });
    expect(readSingleKeyShortcutsEnabled()).toBe(true);
  });

  it.each([Embed.HANDSET, Embed.TABLET])(
    "is not shown on the %s embed",
    (embed) => {
      mocks.context?.set({ os: OperatingSystem.MACOS, embed });
      const { container } = render(ShortcutSettings);

      expect(singleKeySwitch(container)).toBeNull();
    }
  );
});
