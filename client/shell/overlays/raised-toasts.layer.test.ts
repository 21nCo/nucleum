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
import { isToastRaisedAboveModal } from "./raised-toasts";
import TopBarToastHostProbe from "../../../tests/fixtures/components/TopBarToastHostProbe.svelte";

const raisedHost = () =>
  document.querySelector<HTMLElement>('[data-testid="modal-raised-toasts"]');
const inRaised = (testId: string) =>
  raisedHost()?.querySelector<HTMLElement>(`[data-testid="${testId}"]`) ?? null;
const modalShown = (path: string) =>
  document.querySelector(`[data-testid="modal-${path}"]`) !== null;

const DRAWER = "appearance-settings";
const TOP_BAR_HOST = '[data-testid="top-bar-toasts"]';

/** Renders a top bar toast host that follows the same rule as `TopNav`. */
function renderTopBarProbe() {
  render(TopBarToastHostProbe, {
    target: document.body,
    props: { toasts, isRaised: isToastRaisedAboveModal }
  });
}

/** Top bar toast hosts outside the raised host that `nodes` add. */
function addedTopBarHosts(nodes: Iterable<Node>) {
  return [...nodes].filter(
    (node) =>
      node instanceof HTMLElement &&
      node.matches(TOP_BAR_HOST) &&
      !node.closest('[data-testid="modal-raised-toasts"]')
  );
}

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

describe("raised toasts in the modal layer", () => {
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

  it("stays usable and clear of a drawer opened over raised toasts", async () => {
    render(ModalLayer, { target: document.body });
    modalEvent.notify({ path: "settings", isShow: true });
    toasts.pause([toasts.success("Link copied")]);
    await waitFor(() => expect(raisedHost()).not.toBeNull());
    expect(raisedHost()!.className).toContain("right-0");

    modalEvent.notify({
      path: DRAWER,
      isShow: true,
      layout: { alignment: Placement.Right }
    });
    await waitFor(() =>
      expect(raisedHost()!.className).toContain("right-[28rem]")
    );
    expect(raisedHost()!.className).not.toContain("right-0");
    expect(raisedHost()!.closest("[inert]")).toBeNull();
    expect(inRaised("top-bar-toast-latest")?.closest("[inert]")).toBeNull();
  });

  it("spans the full width again once the drawer closes", async () => {
    render(ModalLayer, { target: document.body });
    modalEvent.notify({
      path: DRAWER,
      isShow: true,
      layout: { alignment: Placement.Right }
    });
    modalEvent.notify({ path: "settings", isShow: true });
    toasts.pause([toasts.success("Link copied")]);
    await waitFor(() =>
      expect(raisedHost()?.className).toContain("right-[28rem]")
    );

    modalEvent.hide(DRAWER);
    await waitFor(() => expect(raisedHost()!.className).toContain("right-0"));
  });

  it("keeps a single toast host while a modal opens and closes over toasts", async () => {
    renderTopBarProbe();
    render(ModalLayer, { target: document.body });
    toasts.pause([toasts.success("Link copied")]);
    await waitFor(() =>
      expect(document.querySelectorAll(TOP_BAR_HOST)).toHaveLength(1)
    );
    const counts: number[] = [];
    const observer = new MutationObserver(() =>
      counts.push(document.querySelectorAll(TOP_BAR_HOST).length)
    );
    observer.observe(document.body, { childList: true, subtree: true });

    modalEvent.notify({ path: "settings", isShow: true });
    await waitFor(() => expect(raisedHost()).not.toBeNull());
    modalEvent.hide("settings");
    await waitFor(() => expect(raisedHost()).toBeNull());
    observer.disconnect();

    expect(counts.length).toBeGreaterThan(0);
    expect(counts.every((count) => count === 1)).toBe(true);
  });

  it("never mounts the top bar toast host for a toast raised over an open modal", async () => {
    renderTopBarProbe();
    render(ModalLayer, { target: document.body });
    modalEvent.notify({ path: "settings", isShow: true });
    await waitFor(() => expect(modalShown("settings")).toBe(true));
    const added: Node[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records)
        added.push(...addedTopBarHosts(record.addedNodes));
    });
    observer.observe(document.body, { childList: true, subtree: true });

    toasts.pause([toasts.success("Link copied")]);
    await waitFor(() => expect(raisedHost()).not.toBeNull());
    observer.disconnect();

    expect(added).toEqual([]);
    expect(document.querySelectorAll(TOP_BAR_HOST)).toHaveLength(1);
  });
});
