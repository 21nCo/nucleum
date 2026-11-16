import { cleanup, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";

const mocks = vi.hoisted(() => {
  const { writable } = require("svelte/store") as typeof import("svelte/store");
  return {
    page: writable({ url: new URL("https://local.nucleum.app/calendar") }),
    view: writable({ isConstrainedWidth: false, isPortrait: false }),
    hide: vi.fn(),
    runAction: vi.fn(),
    resolveAction: vi.fn(),
    toggleSearchParam: vi.fn(),
    gotoPath: vi.fn()
  };
});

vi.mock("$app/stores", () => ({ page: mocks.page }));
vi.mock("@21n/ui/environment/view.store", () => ({ default: mocks.view }));
vi.mock("@nucleum/shell/overlays/modal.store", () => ({
  default: { hide: mocks.hide }
}));
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: {
    toggleSearchParam: mocks.toggleSearchParam,
    gotoPath: mocks.gotoPath
  }
}));
vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({
    runAction: mocks.runAction,
    resolveAction: mocks.resolveAction
  })
}));
vi.mock("@nucleum/shared-state/product/surface-config-host", () => ({
  requireSurfaceProductConfig: () => ({
    settings: [
      {
        section: "General",
        children: [
          "datetime-settings",
          "appearance-settings",
          "shortcut-settings",
          "logout"
        ]
      }
    ]
  })
}));
vi.mock("@nucleum/shared-state/product/product-config-host", () => ({
  requireProductConfig: () => ({ homePath: "calendar", homePathPt: "home" })
}));
vi.mock("@nucleum/shared-state/resources/action-renderer", async () => {
  const stub =
    await import("../../../tests/fixtures/components/ActionRendererStub.svelte");
  return { requireActionRenderer: () => stub.default };
});
vi.mock("@nucleum/surfaces/settings/SettingThumbnail.svelte", async () => ({
  default: (
    await import("../../../tests/fixtures/components/SettingThumbnailStub.svelte")
  ).default
}));
vi.mock(
  "@nucleum/surfaces/account/profile/ProfileCPSection.svelte",
  async () => ({
    default: (
      await import("../../../tests/fixtures/components/EmptyStub.svelte")
    ).default
  })
);
vi.mock("@nucleum/surfaces/settings/SettingsFooter.svelte", async () => ({
  default: (await import("../../../tests/fixtures/components/EmptyStub.svelte"))
    .default
}));
vi.mock("@nucleum/shell/navigation/components/BackButton.svelte", async () => ({
  default: (await import("../../../tests/fixtures/components/EmptyStub.svelte"))
    .default
}));

import SettingsAsModal from "./SettingsAsModal.svelte";

/** Settings that open a page inside Settings; `logout` only runs an action. */
const PAGES = ["datetime-settings", "appearance-settings", "shortcut-settings"];

const MODAL_LIST = { axis: "vertical", isModalOpen: true } as const;

function openedSettings() {
  return mocks.toggleSearchParam.mock.calls.map(
    ([params]) => (params as Record<string, string>).setting
  );
}

describe("SettingsAsModal settings list keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAction.mockImplementation((slug: string) =>
      PAGES.includes(slug)
        ? { action: slug, label: slug, component: {} }
        : { action: slug, label: slug }
    );
    mocks.view.set({ isConstrainedWidth: false, isPortrait: false });
    mocks.page.set({ url: new URL("https://local.nucleum.app/calendar") });
  });

  afterEach(() => cleanup());

  it("skips Appearance on wide screens and keeps Settings open", () => {
    render(SettingsAsModal, { props: { isModal: true } });

    expect(contextZone.stepSub(1, MODAL_LIST)).toBe(true);
    expect(contextZone.stepSub(1, MODAL_LIST)).toBe(true);
    expect(contextZone.stepSub(1, MODAL_LIST)).toBe(true);
    expect(contextZone.stepSub(-1, MODAL_LIST)).toBe(true);

    expect(openedSettings()).toEqual([
      "datetime-settings",
      "shortcut-settings",
      "datetime-settings",
      "shortcut-settings"
    ]);
    expect(mocks.hide).not.toHaveBeenCalled();
    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("stops on Appearance inside Settings on narrow screens", () => {
    mocks.view.set({ isConstrainedWidth: true, isPortrait: false });
    render(SettingsAsModal, { props: { isModal: true } });

    expect(contextZone.stepSub(1, MODAL_LIST)).toBe(true);
    expect(contextZone.stepSub(1, MODAL_LIST)).toBe(true);

    expect(openedSettings()).toEqual([
      "datetime-settings",
      "appearance-settings"
    ]);
    expect(mocks.hide).not.toHaveBeenCalled();
    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("steps the list in the modal only while a modal is in front", () => {
    render(SettingsAsModal, { props: { isModal: true } });

    expect(contextZone.stepSub(1, { axis: "vertical" })).toBe(false);
    expect(contextZone.stepSub(1)).toBe(false);
    expect(mocks.toggleSearchParam).not.toHaveBeenCalled();
  });
});
