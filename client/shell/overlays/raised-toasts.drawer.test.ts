import { render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const { writable } = require("svelte/store") as typeof import("svelte/store");
  window.matchMedia = (() => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  })) as never;
  Element.prototype.animate = (() => ({
    cancel: () => undefined,
    finished: Promise.resolve()
  })) as never;
  return {
    view: writable({ isConstrainedWidth: false, isPortrait: false })
  };
});

vi.mock("@21n/ui/environment/view.store", () => ({ default: mocks.view }));
vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));
vi.mock("@nucleum/shared-state/resources/action-renderer", async () => {
  const stub =
    await import("../../../tests/fixtures/components/ActionRendererStub.svelte");
  return { requireActionRenderer: () => stub.default };
});

import { Placement } from "@21n/ui/elements/direction.enum";
import { toasts } from "@nucleum/shared-state/notifications/notification.store";
import modalEvent, { configureOverlayHost, player } from "./modal.store";
import ModalLayer from "./ModalLayer.svelte";

const raisedHost = () =>
  document.querySelector<HTMLElement>('[data-testid="modal-raised-toasts"]');

describe("raised toasts with the right-side drawer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    configureOverlayHost({
      onDismiss: vi.fn(),
      openFullscreen: vi.fn(),
      closeFullscreen: vi.fn(),
      resolvePlayer: vi.fn(() => "")
    });
    modalEvent.reset();
    player.reset();
    toasts.reset();
    mocks.view.set({ isConstrainedWidth: false, isPortrait: false });
  });

  afterEach(() => {
    modalEvent.reset();
    toasts.reset();
  });

  it("stays usable and clear of a drawer opened over raised toasts", async () => {
    render(ModalLayer, { target: document.body });
    modalEvent.notify({ path: "settings", isShow: true });
    toasts.pause([toasts.success("Link copied")]);
    await waitFor(() => expect(raisedHost()).not.toBeNull());
    expect(raisedHost()!.className).toContain("right-0");

    modalEvent.notify({
      path: "appearance-settings",
      isShow: true,
      layout: { alignment: Placement.Right }
    });
    await waitFor(() =>
      expect(raisedHost()!.className).toContain("right-[28rem]")
    );
    expect(raisedHost()!.className).not.toContain("right-0");
    expect(raisedHost()!.closest("[inert]")).toBeNull();
    expect(
      raisedHost()!
        .querySelector('[data-testid="top-bar-toast-latest"]')
        ?.closest("[inert]")
    ).toBeNull();
  });

  it("spans the full width again once the drawer closes", async () => {
    render(ModalLayer, { target: document.body });
    modalEvent.notify({
      path: "appearance-settings",
      isShow: true,
      layout: { alignment: Placement.Right }
    });
    modalEvent.notify({ path: "settings", isShow: true });
    toasts.pause([toasts.success("Link copied")]);
    await waitFor(() =>
      expect(raisedHost()?.className).toContain("right-[28rem]")
    );

    modalEvent.hide("appearance-settings");
    await waitFor(() => expect(raisedHost()!.className).toContain("right-0"));
  });
});
