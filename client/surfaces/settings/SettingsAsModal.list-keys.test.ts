import { cleanup, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";
import { stepListItem } from "@nucleum/shell/shortcuts/list-item-step";

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

describe("SettingsAsModal settings list keys with layers in front", () => {
  /** Renders Settings inside a modal overlay, optionally inside its dialog. */
  function renderInModal(options: { isInDialog?: boolean } = {}) {
    const modal = document.createElement("div");
    modal.setAttribute("data-blank-modal", "0");
    let target: HTMLElement = modal;
    if (options.isInDialog) {
      const dialog = document.createElement("dialog");
      dialog.setAttribute("open", "");
      modal.append(dialog);
      target = dialog;
    }
    document.body.append(modal);
    render(SettingsAsModal, { props: { isModal: true }, target });
  }

  function addLayer(html: string) {
    const holder = document.createElement("div");
    holder.innerHTML = html;
    const layer = holder.firstElementChild as HTMLElement;
    document.body.append(layer);
    return layer;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    mocks.resolveAction.mockImplementation((slug: string) =>
      PAGES.includes(slug)
        ? { action: slug, label: slug, component: {} }
        : { action: slug, label: slug }
    );
    mocks.view.set({ isConstrainedWidth: false, isPortrait: false });
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("steps the list while its own modal is in front, also inside the modal's dialog", () => {
    renderInModal({ isInDialog: true });

    expect(stepListItem(1)).toBe(true);
    expect(openedSettings()).toEqual(["datetime-settings"]);
  });

  it("leaves the list alone while another modal is stacked over Settings", () => {
    renderInModal();
    addLayer('<div data-blank-modal="1"><button>Clear cache</button></div>');

    expect(stepListItem(1)).toBe(false);
    expect(mocks.toggleSearchParam).not.toHaveBeenCalled();
  });

  it("leaves the list alone while a popover is open over Settings", () => {
    renderInModal();
    const popover = addLayer('<div class="popover"></div>');
    // jsdom lays out nothing, so give the popover a box to count as shown.
    popover.getClientRects = () =>
      [{ width: 10, height: 10 }] as unknown as DOMRectList;

    expect(stepListItem(1)).toBe(false);
    expect(mocks.toggleSearchParam).not.toHaveBeenCalled();
  });

  it("leaves the list alone while a dialog or aria-modal layer is over Settings", () => {
    renderInModal({ isInDialog: true });
    const dialog = addLayer("<dialog open></dialog>");

    expect(stepListItem(1)).toBe(false);

    dialog.remove();
    addLayer('<div aria-modal="true"></div>');

    expect(stepListItem(-1)).toBe(false);
    expect(mocks.toggleSearchParam).not.toHaveBeenCalled();
  });
});
