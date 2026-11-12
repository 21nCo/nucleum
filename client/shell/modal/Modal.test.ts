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
import { configureCommandHost } from "@nucleum/shared-state/commands/command-host";
import SelectOptionsEditor from "@nucleum/features/collections/properties/propertyConfig/selectProperty/SelectOptionsEditor.svelte";
import MemoryBase from "@nucleum/products/memotron/base/MemoryBase.svelte";
import Modal from "./Modal.svelte";
import RightDrawerHarness from "../../../tests/fixtures/components/RightDrawerHarness.svelte";

const children = createRawSnippet(() => ({
  render: () =>
    `<div><button data-testid="first">First</button><button data-testid="last">Last</button></div>`
}));

function popoverContainer() {
  const popovers = document.createElement("div");
  popovers.id = "popovers";
  document.body.append(popovers);
  return popovers;
}

function openPopover(popovers: HTMLElement) {
  popovers.innerHTML = `<div class="popover"><button>Option</button></div>`;
  return popovers.querySelector("button")!;
}

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

  it("exposes the drawer as a labelled dialog over a non-focusable backdrop", () => {
    const { getByTestId, container } = renderDrawer();
    const panel = getByTestId("modal-appearance-settings");
    const overlay = container.querySelector("[data-blank-modal]");

    expect(panel.getAttribute("data-modal-placement")).toBe("right");
    expect(panel.getAttribute("role")).toBe("dialog");
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

  it("keeps keys pressed in its popovers, on the body or on a background control from the app behind it", async () => {
    const popovers = popoverContainer();
    const background = document.createElement("button");
    document.body.append(background);
    const documentKey = vi.fn();
    const windowKey = vi.fn();
    const backgroundKey = vi.fn();
    document.addEventListener("keydown", documentKey);
    window.addEventListener("keydown", windowKey);
    background.addEventListener("keydown", backgroundKey);
    renderDrawer();
    const option = openPopover(popovers);
    const optionKey = vi.fn();
    option.addEventListener("keydown", optionKey);

    await fireEvent.keyDown(option, { key: "n" });
    expect(optionKey).toHaveBeenCalledTimes(1);
    await fireEvent.keyDown(document.body, { key: "l" });
    const enter = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true
    });
    background.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(backgroundKey).not.toHaveBeenCalled();
    expect(documentKey).not.toHaveBeenCalled();
    expect(windowKey).not.toHaveBeenCalled();

    await fireEvent.keyDown(document.body, { key: "Escape" });
    expect(windowKey).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", documentKey);
    window.removeEventListener("keydown", windowKey);
  });

  it("includes the popovers it opens in the Tab cycle", async () => {
    const popovers = popoverContainer();
    const { getByTestId } = renderDrawer();
    const first = getByTestId("first");
    const last = getByTestId("last");
    const option = openPopover(popovers);

    last.focus();
    await fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(option);

    await fireEvent.keyDown(option, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    await fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(option);
  });

  it("makes popovers left open behind it inert and keeps them out of the Tab cycle", async () => {
    const popovers = popoverContainer();
    const stale = openPopover(popovers);
    const { getByTestId, rerender } = renderDrawer();
    const first = getByTestId("first");
    const last = getByTestId("last");

    expect(stale.closest<HTMLElement>(".popover")?.inert).toBe(true);
    last.focus();
    await fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    await fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);

    await rerender({ show: false });
    await waitFor(() =>
      expect(stale.closest<HTMLElement>(".popover")?.inert).toBe(false)
    );
  });

  it("pulls Tab from outside the drawer back into it", async () => {
    const background = document.createElement("button");
    document.body.append(background);
    const { getByTestId } = renderDrawer();

    background.focus();
    await fireEvent.keyDown(background, { key: "Tab" });
    expect(document.activeElement).toBe(getByTestId("first"));

    (document.activeElement as HTMLElement).blur();
    await fireEvent.keyDown(document.body, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(getByTestId("last"));
  });

  it("leaves keys and Tab to a modal above it", async () => {
    const documentKey = vi.fn();
    document.addEventListener("keydown", documentKey);
    renderDrawer();
    const above = document.createElement("div");
    above.setAttribute("data-blank-modal", "1");
    above.innerHTML = `<button>Confirm</button>`;
    document.body.append(above);
    const confirm = above.querySelector("button")!;
    confirm.focus();

    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true
    });
    confirm.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(confirm);
    await fireEvent.keyDown(confirm, { key: "n" });
    expect(documentKey).toHaveBeenCalled();
    document.removeEventListener("keydown", documentKey);
  });

  it("lets keys reach the app again after it closes", async () => {
    const documentKey = vi.fn();
    document.addEventListener("keydown", documentKey);
    const { rerender } = renderDrawer();
    await rerender({ show: false });
    await waitFor(() =>
      expect(document.querySelector("[data-blank-modal]")).toBeNull()
    );

    await fireEvent.keyDown(document.body, { key: "l" });
    expect(documentKey).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", documentKey);
  });

  it("makes the app behind it inert, keeps its popovers in the accessibility tree and restores both on close", async () => {
    const app = document.createElement("div");
    const alreadyInert = document.createElement("div");
    alreadyInert.setAttribute("inert", "");
    document.body.append(app, alreadyInert);
    const popovers = popoverContainer();
    const { getByTestId, rerender } = renderDrawer();
    const option = openPopover(popovers);
    const panel = getByTestId("modal-appearance-settings");

    expect(app.hasAttribute("inert")).toBe(true);
    expect(popovers.hasAttribute("inert")).toBe(false);
    expect(panel.closest("[inert]")).toBeNull();
    expect(option.closest("[inert]")).toBeNull();
    expect(panel.hasAttribute("aria-modal")).toBe(false);

    await rerender({ show: false });
    await waitFor(() => expect(app.hasAttribute("inert")).toBe(false));
    expect(alreadyInert.hasAttribute("inert")).toBe(true);
  });

  it("keeps a background editor's earlier window Enter listener from adding an option", async () => {
    const onChange = vi.fn();
    const editor = render(SelectOptionsEditor, {
      props: { config: { options: [], groups: [] }, onChange }
    });
    const input = editor.container.querySelector("input")!;
    await fireEvent.input(input, { target: { value: "Urgent" } });
    const { getByTestId } = renderDrawer();
    const first = getByTestId("first");
    first.focus();

    await fireEvent.keyDown(first, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps a paste or a drag over the drawer from the app's global handlers", async () => {
    const runAction = vi.fn();
    configureCommandHost({
      runAction,
      resolveAction: () => null,
      runResourceAction: vi.fn()
    });
    render(MemoryBase);
    const { getByTestId } = renderDrawer();

    await fireEvent.paste(getByTestId("first"));
    await fireEvent.dragEnter(getByTestId("first"), { relatedTarget: null });
    expect(runAction).not.toHaveBeenCalled();
  });

  it("leaves Tab to a drawer control that handles it", async () => {
    const { getByTestId } = renderDrawer();
    const first = getByTestId("first");
    first.addEventListener("keydown", (event) => event.preventDefault());
    first.focus();

    await fireEvent.keyDown(first, { key: "Tab" });
    expect(document.activeElement).toBe(first);
  });

  it.each([
    ["removed", true],
    ["the body", false]
  ])(
    "returns focus to the app's first control when the opener is %s",
    async (_label, isRemovedAfterOpening) => {
      const app = document.createElement("div");
      app.innerHTML = `<button data-testid="app-start">Home</button>`;
      const opener = document.createElement("button");
      document.body.append(app, opener);
      opener.focus();
      if (!isRemovedAfterOpening) opener.blur();
      const { getByTestId, rerender } = renderDrawer();
      await tick();
      if (isRemovedAfterOpening) opener.remove();

      await rerender({ show: false });
      await waitFor(() =>
        expect(document.activeElement).toBe(getByTestId("app-start"))
      );
    }
  );

  it("keeps the app inert while a second drawer is open after the first closes", async () => {
    const app = document.createElement("div");
    document.body.append(app);
    const first = renderDrawer();
    const second = render(Modal, {
      props: {
        id: "second-drawer",
        title: "Second",
        alignment: Placement.Right,
        children
      }
    });

    await first.rerender({ show: false });
    await waitFor(() =>
      expect(document.querySelectorAll("[data-blank-modal]")).toHaveLength(1)
    );
    expect(app.hasAttribute("inert")).toBe(true);

    await second.rerender({ show: false });
    await waitFor(() => expect(app.hasAttribute("inert")).toBe(false));
  });

  it("keeps the centred modal at constrained widths", () => {
    mocks.view.set({ isConstrainedWidth: true, isPortrait: false });
    const { getByTestId } = renderDrawer();
    const panel = getByTestId("modal-appearance-settings");

    expect(panel.hasAttribute("data-modal-placement")).toBe(false);
    expect(panel.hasAttribute("role")).toBe(false);
  });
});
