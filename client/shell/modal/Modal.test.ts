import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const { writable } = require("svelte/store") as typeof import("svelte/store");
  return {
    view: writable({ isConstrainedWidth: false, isPortrait: false })
  };
});

vi.mock("@21n/ui/environment/view.store", () => ({ default: mocks.view }));

import { Placement } from "@21n/ui/elements/direction.enum";
import Modal from "./Modal.svelte";
import RightDrawerHarness from "../../../tests/fixtures/components/RightDrawerHarness.svelte";

const children = createRawSnippet(() => ({
  render: () =>
    `<div><button data-testid="first">First</button><button data-testid="last">Last</button></div>`
}));

function renderDrawer() {
  return render(Modal, {
    props: {
      id: "appearance-settings",
      title: "Appearance",
      alignment: Placement.Right,
      children
    }
  });
}

describe("Modal right-side drawer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    mocks.view.set({ isConstrainedWidth: false, isPortrait: false });
  });

  it("exposes the drawer as a labelled modal dialog over a non-focusable backdrop", () => {
    const { getByTestId, container } = renderDrawer();
    const panel = getByTestId("modal-appearance-settings");
    const overlay = container.querySelector("[data-blank-modal]");

    expect(panel.getAttribute("data-modal-placement")).toBe("right");
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(panel.getAttribute("aria-label")).toBe("Appearance");
    expect(overlay?.getAttribute("role")).not.toBe("button");
    expect(overlay?.hasAttribute("tabindex")).toBe(false);
  });

  it("moves focus into the drawer when it opens", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { getByTestId } = renderDrawer();
    await tick();

    expect(
      getByTestId("modal-appearance-settings").contains(document.activeElement)
    ).toBe(true);
  });

  it("keeps Tab and Shift+Tab inside the drawer", async () => {
    const { getByTestId } = renderDrawer();
    const first = getByTestId("first");
    const last = getByTestId("last");

    last.focus();
    await fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    await fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("returns focus to the opener when it closes", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { rerender } = renderDrawer();
    await tick();
    expect(document.activeElement).not.toBe(opener);

    await rerender({ show: false });
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("keeps keys pressed in the drawer from document listeners behind it after its own controls handle them", async () => {
    const onInnerKey = vi.fn();
    const documentKey = vi.fn();
    document.addEventListener("keydown", documentKey);
    const { getByTestId } = render(RightDrawerHarness, {
      props: { drawer: Modal as never, alignment: Placement.Right, onInnerKey }
    });
    const inner = getByTestId("inner");

    await fireEvent.keyDown(inner, { key: "n" });
    await fireEvent.keyDown(inner, { key: "ArrowRight" });
    expect(onInnerKey).toHaveBeenCalledTimes(2);
    expect(documentKey).not.toHaveBeenCalled();

    await fireEvent.keyDown(inner, { key: "Escape" });
    expect(documentKey).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", documentKey);
  });

  it("keeps keys pressed in its popovers or on the body from the app behind it", async () => {
    const popovers = document.createElement("div");
    popovers.id = "popovers";
    popovers.innerHTML = `<div class="popover"><button data-testid="option">Option</button></div>`;
    document.body.append(popovers);
    const documentKey = vi.fn();
    const windowKey = vi.fn();
    document.addEventListener("keydown", documentKey);
    window.addEventListener("keydown", windowKey);
    renderDrawer();

    await fireEvent.keyDown(popovers.querySelector("button")!, { key: "n" });
    await fireEvent.keyDown(document.body, { key: "l" });
    expect(documentKey).not.toHaveBeenCalled();
    expect(windowKey).not.toHaveBeenCalled();

    await fireEvent.keyDown(document.body, { key: "Escape" });
    expect(windowKey).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", documentKey);
    window.removeEventListener("keydown", windowKey);
  });

  it("includes its popovers in the Tab cycle", async () => {
    const popovers = document.createElement("div");
    popovers.id = "popovers";
    popovers.innerHTML = `<div class="popover"><button data-testid="option">Option</button></div>`;
    document.body.append(popovers);
    const { getByTestId } = renderDrawer();
    const first = getByTestId("first");
    const last = getByTestId("last");
    const option = popovers.querySelector("button")!;

    last.focus();
    await fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(option);

    await fireEvent.keyDown(option, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    await fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(option);
  });

  it("lets keys reach the app again after it closes", async () => {
    const documentKey = vi.fn();
    document.addEventListener("keydown", documentKey);
    const { rerender } = renderDrawer();
    await rerender({ show: false });

    await fireEvent.keyDown(document.body, { key: "l" });
    expect(documentKey).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", documentKey);
  });

  it("keeps the centred modal at constrained widths", () => {
    mocks.view.set({ isConstrainedWidth: true, isPortrait: false });
    const { getByTestId } = renderDrawer();
    const panel = getByTestId("modal-appearance-settings");

    expect(panel.hasAttribute("data-modal-placement")).toBe(false);
    expect(panel.hasAttribute("role")).toBe(false);
  });
});
