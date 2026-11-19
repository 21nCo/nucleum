import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { itemNavigation } from "@21n/ui/actions/itemNavigation.action";
import { configureElementShortcutHost } from "@21n/ui/hosts/shortcut-host";

let isSingleKeyEnabled = true;

function pressKey(target: Element, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
    ...init
  });
  target.dispatchEvent(event);
  return event;
}

describe("item navigation list keys and the single-key shortcuts setting", () => {
  const actions: { destroy: () => void }[] = [];
  const onOpen = vi.fn();
  const onToggle = vi.fn();
  const onMenu = vi.fn();
  const shown = () =>
    Array.from(document.querySelectorAll("[data-item-highlighted]")).map(
      (element) => element.getAttribute("data-id")
    );

  function mountList() {
    const node = document.createElement("div");
    ["a", "b"].forEach((id, index) => {
      const element = document.createElement("div");
      element.id = `thumbnail-${id}`;
      element.dataset.id = id;
      element.getBoundingClientRect = () =>
        ({ top: index * 50, left: 0, width: 100, height: 40 }) as DOMRect;
      node.append(element);
    });
    document.body.append(node);
    actions.push(
      itemNavigation(node, {
        itemSelector: "[id^='thumbnail-'][data-id]",
        onOpen,
        onToggle
      })
    );
    node.addEventListener("itemmenu", onMenu, true);
    return node;
  }

  beforeEach(() => {
    isSingleKeyEnabled = true;
    configureElementShortcutHost({
      resolve: () => undefined,
      isSingleKeyEnabled: () => isSingleKeyEnabled
    });
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
      {}
    ] as unknown as DOMRectList);
    Element.prototype.scrollIntoView = vi.fn();
    mountList();
    pressKey(document.body, "ArrowDown");
  });

  afterEach(() => {
    while (actions.length > 0) actions.pop()!.destroy();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("opens the menu on '.' and toggles on Space while on", () => {
    expect(shown()).toEqual(["a"]);
    expect(pressKey(document.body, ".").defaultPrevented).toBe(true);
    expect(onMenu).toHaveBeenCalledTimes(1);
    expect(pressKey(document.body, " ").defaultPrevented).toBe(true);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("neither claims nor acts on '.' or Space while off", () => {
    isSingleKeyEnabled = false;
    expect(pressKey(document.body, ".").defaultPrevented).toBe(false);
    expect(pressKey(document.body, " ").defaultPrevented).toBe(false);
    expect(onMenu).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("keeps arrows, Enter, ContextMenu and Shift+F10 while off", () => {
    isSingleKeyEnabled = false;
    pressKey(document.body, "ArrowDown");
    expect(shown()).toEqual(["b"]);
    expect(pressKey(document.body, "ContextMenu").defaultPrevented).toBe(true);
    expect(
      pressKey(document.body, "F10", { shiftKey: true }).defaultPrevented
    ).toBe(true);
    expect(onMenu).toHaveBeenCalledTimes(2);
    expect(pressKey(document.body, "Enter").defaultPrevented).toBe(true);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("follows the setting as it changes", () => {
    isSingleKeyEnabled = false;
    pressKey(document.body, ".");
    expect(onMenu).not.toHaveBeenCalled();
    isSingleKeyEnabled = true;
    pressKey(document.body, ".");
    expect(onMenu).toHaveBeenCalledTimes(1);
  });
});
