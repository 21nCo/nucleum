import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
        children: ["appearance-settings", "datetime-settings"]
      }
    ]
  })
}));
vi.mock("@nucleum/shared-state/product/product-config-host", () => ({
  requireProductConfig: () => ({
    homePath: "calendar",
    homePathPt: "home"
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
    mocks.view.set({ isConstrainedWidth: false, isPortrait: false });
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
    expect(mocks.gotoPath).not.toHaveBeenCalled();
  });

  it("leaves page-hosted Settings for its return path and opens the Appearance drawer", async () => {
    mocks.view.set({ isConstrainedWidth: false, isPortrait: true });
    mocks.page.set({
      url: new URL("https://local.nucleum.app/cp?returnTo=%2Fhome")
    });
    const { getByTestId, queryByTestId } = render(SettingsAsModal, {
      props: { isModal: false }
    });
    await fireEvent.click(getByTestId("setting-appearance-settings"));
    await tick();

    expect(mocks.gotoPath).toHaveBeenCalledWith("/home", {
      replaceState: true
    });
    expect(mocks.runAction).toHaveBeenCalledWith("appearance-settings");
    expect(mocks.hide).not.toHaveBeenCalled();
    expect(mocks.toggleSearchParam).not.toHaveBeenCalled();
    expect(queryByTestId("action-renderer")).toBeNull();
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

  it("replaces a page-hosted Appearance deep link without a return path with the product home", async () => {
    mocks.view.set({ isConstrainedWidth: false, isPortrait: true });
    mocks.page.set({
      url: new URL("https://local.nucleum.app/cp?setting=appearance-settings")
    });
    const { queryByTestId } = render(SettingsAsModal, {
      props: { isModal: false }
    });

    await waitFor(() =>
      expect(mocks.runAction).toHaveBeenCalledWith("appearance-settings")
    );
    expect(mocks.gotoPath).toHaveBeenCalledWith("/home", {
      replaceState: true
    });
    expect(mocks.hide).not.toHaveBeenCalled();
    expect(mocks.toggleSearchParam).not.toHaveBeenCalled();
    expect(queryByTestId("action-renderer")).toBeNull();
  });

  it("uses the landscape home when page-hosted Settings is shown in landscape", async () => {
    mocks.page.set({ url: new URL("https://local.nucleum.app/cp") });
    const { getByTestId } = render(SettingsAsModal, {
      props: { isModal: false }
    });
    await fireEvent.click(getByTestId("setting-appearance-settings"));

    expect(mocks.gotoPath).toHaveBeenCalledWith("/calendar", {
      replaceState: true
    });
    expect(mocks.runAction).toHaveBeenCalledWith("appearance-settings");
  });

  it.each([
    ["an external URL", "https://example.net/home"],
    ["a protocol-relative URL", "//example.net/home"],
    ["a backslash host URL", "/\\example.net/home"],
    ["a scheme", "javascript:alert(1)"],
    ["the Settings route", "/cp"],
    ["a Settings sub-route", "/cp/targets?setting=data-settings"],
    ["an encoded Settings route", "/%63p"]
  ])(
    "falls back to the product home when the return path is %s",
    async (_label, returnTo) => {
      mocks.view.set({ isConstrainedWidth: false, isPortrait: true });
      const url = new URL("https://local.nucleum.app/cp");
      url.searchParams.set("setting", "appearance-settings");
      url.searchParams.set("returnTo", returnTo);
      mocks.page.set({ url });
      render(SettingsAsModal, { props: { isModal: false } });

      await waitFor(() =>
        expect(mocks.runAction).toHaveBeenCalledWith("appearance-settings")
      );
      expect(mocks.gotoPath).toHaveBeenCalledTimes(1);
      expect(mocks.gotoPath).toHaveBeenCalledWith("/home", {
        replaceState: true
      });
    }
  );

  it.each([
    ["an overlay", "/calendar?overlay=cp"],
    ["a right panel", "/calendar?panel=cp"],
    ["a page", "/calendar?page=cp"],
    ["a beside page", "/calendar?besidePage=cp"],
    ["the base split", "/calendar?beside=cp"],
    ["the legacy full param", "/calendar?full=cp"],
    ["a later repeated overlay", "/calendar?overlay=library&overlay=cp"],
    ["an encoded overlay sub-route", "/calendar?overlay=%2FCP%2Ftargets"]
  ])(
    "falls back to the product home when the return path opens Settings in %s",
    async (_label, returnTo) => {
      mocks.view.set({ isConstrainedWidth: false, isPortrait: true });
      const url = new URL("https://local.nucleum.app/cp");
      url.searchParams.set("setting", "appearance-settings");
      url.searchParams.set("returnTo", returnTo);
      mocks.page.set({ url });
      render(SettingsAsModal, { props: { isModal: false } });

      await waitFor(() =>
        expect(mocks.runAction).toHaveBeenCalledWith("appearance-settings")
      );
      expect(mocks.gotoPath).toHaveBeenCalledTimes(1);
      expect(mocks.gotoPath).toHaveBeenCalledWith("/home", {
        replaceState: true
      });
    }
  );

  it("keeps an in-app return path whose layers open other surfaces", async () => {
    mocks.view.set({ isConstrainedWidth: false, isPortrait: true });
    const url = new URL("https://local.nucleum.app/cp");
    url.searchParams.set("returnTo", "/calendar?overlay=library&panel=cpu");
    mocks.page.set({ url });
    const { getByTestId } = render(SettingsAsModal, {
      props: { isModal: false }
    });
    await fireEvent.click(getByTestId("setting-appearance-settings"));

    expect(mocks.gotoPath).toHaveBeenCalledWith(
      "/calendar?overlay=library&panel=cpu",
      { replaceState: true }
    );
  });

  it("keeps an in-app return path with its query when handing off", async () => {
    mocks.view.set({ isConstrainedWidth: false, isPortrait: true });
    const url = new URL("https://local.nucleum.app/cp");
    url.searchParams.set("returnTo", "/goal/abc?tab=notes");
    mocks.page.set({ url });
    const { getByTestId } = render(SettingsAsModal, {
      props: { isModal: false }
    });
    await fireEvent.click(getByTestId("setting-appearance-settings"));

    expect(mocks.gotoPath).toHaveBeenCalledWith("/goal/abc?tab=notes", {
      replaceState: true
    });
  });

  it("keeps Appearance inside the Settings modal at constrained widths", async () => {
    mocks.view.set({ isConstrainedWidth: true, isPortrait: false });
    const { getByTestId } = render(SettingsAsModal, {
      props: { isModal: true }
    });
    await fireEvent.click(getByTestId("setting-appearance-settings"));

    expect(mocks.hide).not.toHaveBeenCalled();
    expect(mocks.runAction).not.toHaveBeenCalled();
    expect(mocks.gotoPath).not.toHaveBeenCalled();
  });
});
