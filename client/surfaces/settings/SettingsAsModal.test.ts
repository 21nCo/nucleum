import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const { writable } = require("svelte/store") as typeof import("svelte/store");
  return {
    page: writable({ url: new URL("https://local.nucleum.app/calendar") }),
    view: writable({ isConstrainedWidth: false }),
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
        children: ["appearance-settings", "datetime-settings"]
      }
    ]
  })
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

const appearance = {
  action: "appearance-settings",
  label: "Appearance",
  component: {}
};

describe("SettingsAsModal Appearance handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAction.mockImplementation((slug: string) =>
      slug === appearance.action ? appearance : null
    );
    mocks.view.set({ isConstrainedWidth: false });
    mocks.page.set({ url: new URL("https://local.nucleum.app/calendar") });
  });

  it("closes the Settings modal and opens the Appearance drawer when chosen in the sidebar", async () => {
    const { getByTestId } = render(SettingsAsModal, {
      props: { isModal: true }
    });
    await fireEvent.click(getByTestId("setting-appearance-settings"));

    expect(mocks.hide).toHaveBeenCalledWith("cp", "SettingsAsModal");
    expect(mocks.runAction).toHaveBeenCalledWith("appearance-settings");
    expect(mocks.toggleSearchParam).not.toHaveBeenCalled();
  });

  it("keeps Appearance inline when Settings is rendered as a page", async () => {
    const { getByTestId, queryByTestId } = render(SettingsAsModal, {
      props: { isModal: false }
    });
    await fireEvent.click(getByTestId("setting-appearance-settings"));
    await tick();

    expect(mocks.hide).not.toHaveBeenCalled();
    expect(mocks.runAction).not.toHaveBeenCalled();
    expect(mocks.toggleSearchParam).toHaveBeenCalledWith({
      setting: "appearance-settings"
    });
    expect(queryByTestId("action-renderer")).toBeTruthy();
  });

  it("hands a deep link to Appearance to the drawer and clears it when Settings is a modal", async () => {
    mocks.page.set({
      url: new URL(
        "https://local.nucleum.app/calendar?setting=appearance-settings"
      )
    });
    render(SettingsAsModal, { props: { isModal: true } });

    await waitFor(() =>
      expect(mocks.runAction).toHaveBeenCalledWith("appearance-settings")
    );
    expect(mocks.hide).toHaveBeenCalledWith("cp", "SettingsAsModal");
    expect(mocks.toggleSearchParam).toHaveBeenCalledWith(["setting"]);
  });

  it("renders a deep link to Appearance inside page-hosted Settings", async () => {
    mocks.page.set({
      url: new URL("https://local.nucleum.app/cp?setting=appearance-settings")
    });
    const { findByTestId } = render(SettingsAsModal, {
      props: { isModal: false }
    });

    expect(await findByTestId("action-renderer")).toBeTruthy();
    expect(mocks.hide).not.toHaveBeenCalled();
    expect(mocks.runAction).not.toHaveBeenCalled();
    expect(mocks.toggleSearchParam).not.toHaveBeenCalled();
  });

  it("keeps Appearance inside the Settings modal at constrained widths", async () => {
    mocks.view.set({ isConstrainedWidth: true });
    const { getByTestId } = render(SettingsAsModal, {
      props: { isModal: true }
    });
    await fireEvent.click(getByTestId("setting-appearance-settings"));

    expect(mocks.hide).not.toHaveBeenCalled();
    expect(mocks.runAction).not.toHaveBeenCalled();
  });
});
