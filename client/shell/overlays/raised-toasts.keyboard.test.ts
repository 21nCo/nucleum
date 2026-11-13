import { fireEvent, render, waitFor } from "@testing-library/svelte";
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
const inRaised = (testId: string) =>
  raisedHost()?.querySelector<HTMLElement>(`[data-testid="${testId}"]`) ?? null;
const modalShown = (path: string) =>
  document.querySelector(`[data-testid="modal-${path}"]`) !== null;

const DRAWER = "appearance-settings";

async function raiseTwoToasts() {
  toasts.pause([
    toasts.success("First copied"),
    toasts.success("Second copied")
  ]);
  await waitFor(() => expect(inRaised("top-bar-toast-count")).not.toBeNull());
}

async function openList() {
  await fireEvent.click(inRaised("top-bar-toast-count")!);
  await waitFor(() => expect(inRaised("top-bar-toast-list")).not.toBeNull());
}

describe("raised toasts from the keyboard", () => {
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

  it("closes only the toast list on Escape and leaves the modal open", async () => {
    render(ModalLayer, { target: document.body });
    modalEvent.notify({ path: "settings", isShow: true });
    await raiseTwoToasts();
    await openList();

    inRaised("top-bar-toast-count")!.focus();
    await fireEvent.keyDown(inRaised("top-bar-toast-count")!, {
      key: "Escape"
    });

    await waitFor(() => expect(inRaised("top-bar-toast-list")).toBeNull());
    expect(modalShown("settings")).toBe(true);
    expect(raisedHost()).not.toBeNull();

    await fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(modalShown("settings")).toBe(false));
  });

  it("closes only the toast list on Escape over the right-side drawer", async () => {
    render(ModalLayer, { target: document.body });
    modalEvent.notify({ path: "settings", isShow: true });
    await raiseTwoToasts();
    modalEvent.notify({
      path: DRAWER,
      isShow: true,
      layout: { alignment: Placement.Right }
    });
    await waitFor(() => expect(modalShown(DRAWER)).toBe(true));
    await openList();

    await fireEvent.keyDown(inRaised("top-bar-toast-count")!, {
      key: "Escape"
    });

    await waitFor(() => expect(inRaised("top-bar-toast-list")).toBeNull());
    expect(modalShown(DRAWER)).toBe(true);
    expect(modalShown("settings")).toBe(true);
  });

  it("brings the raised toasts into the drawer's Tab cycle and lets their keys through", async () => {
    render(ModalLayer, { target: document.body });
    modalEvent.notify({
      path: DRAWER,
      isShow: true,
      layout: { alignment: Placement.Right }
    });
    toasts.pause([toasts.success("Link copied")]);
    await waitFor(() =>
      expect(inRaised("top-bar-toast-dismiss")).not.toBeNull()
    );
    const drawer = document.querySelector<HTMLElement>(
      `[data-testid="modal-${DRAWER}"]`
    )!;
    const toastText = inRaised("top-bar-toast-latest")!.querySelector(
      "button"
    )!;
    const dismiss = inRaised("top-bar-toast-dismiss")!;

    drawer.focus();
    await fireEvent.keyDown(drawer, { key: "Tab" });
    expect(document.activeElement).toBe(toastText);
    await fireEvent.keyDown(toastText, { key: "Tab" });
    expect(document.activeElement).toBe(dismiss);
    await fireEvent.keyDown(dismiss, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(toastText);

    expect(await fireEvent.keyDown(dismiss, { key: "Enter" })).toBe(true);
    expect(await fireEvent.keyDown(dismiss, { key: " " })).toBe(true);
  });
});
