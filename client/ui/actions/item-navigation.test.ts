import { render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContextMenu from "@21n/ui/elements/contextMenu/ContextMenu.svelte";
import ContextMenuAction from "@21n/ui/elements/contextMenu/ContextMenuAction.svelte";
import { createRangeSelection } from "@nucleum/features/records/resource.actions";
import { bulkEditStore } from "@nucleum/shared-state/resources/bulkedit.store";
import { itemNavigation } from "@21n/ui/actions/itemNavigation.action";
import {
  isItemNavigationKey,
  resolveItemNavigationIndex,
  resolveItemRange,
  resolveItemRow,
  type ItemNavigationRect
} from "./item-navigation";

function grid(columns: number, count: number): ItemNavigationRect[] {
  return Array.from({ length: count }, (_, index) => ({
    top: Math.floor(index / columns) * 110,
    left: (index % columns) * 210,
    width: 200,
    height: 100
  }));
}

describe("item navigation", () => {
  it("recognises only plain arrow keys", () => {
    expect(isItemNavigationKey("ArrowUp")).toBe(true);
    expect(isItemNavigationKey("ArrowRight")).toBe(true);
    expect(isItemNavigationKey("Enter")).toBe(false);
  });

  it("groups items into visual rows", () => {
    const items = grid(3, 7);
    expect(resolveItemRow(items, 1)).toEqual([0, 1, 2]);
    expect(resolveItemRow(items, 3)).toEqual([3, 4, 5]);
    expect(resolveItemRow(items, 6)).toEqual([6]);
  });

  it("highlights the first item on the first press", () => {
    expect(resolveItemNavigationIndex(grid(3, 7), undefined, "ArrowDown")).toBe(
      0
    );
    expect(resolveItemNavigationIndex(grid(3, 7), undefined, "ArrowLeft")).toBe(
      0
    );
    expect(
      resolveItemNavigationIndex([], undefined, "ArrowDown")
    ).toBeUndefined();
  });

  it("moves Up and Down through a single-column list", () => {
    const list = grid(1, 3);
    expect(resolveItemNavigationIndex(list, 0, "ArrowDown")).toBe(1);
    expect(resolveItemNavigationIndex(list, 2, "ArrowDown")).toBe(2);
    expect(resolveItemNavigationIndex(list, 1, "ArrowUp")).toBe(0);
    expect(resolveItemNavigationIndex(list, 1, "ArrowRight")).toBe(1);
  });

  it("moves Left and Right within a grid row and stops at its edges", () => {
    const items = grid(3, 7);
    expect(resolveItemNavigationIndex(items, 1, "ArrowRight")).toBe(2);
    expect(resolveItemNavigationIndex(items, 2, "ArrowRight")).toBe(2);
    expect(resolveItemNavigationIndex(items, 3, "ArrowLeft")).toBe(3);
  });

  it("moves Up and Down across grid rows to the nearest column", () => {
    const items = grid(3, 7);
    expect(resolveItemNavigationIndex(items, 1, "ArrowDown")).toBe(4);
    expect(resolveItemNavigationIndex(items, 5, "ArrowDown")).toBe(6);
    expect(resolveItemNavigationIndex(items, 4, "ArrowUp")).toBe(1);
    expect(resolveItemNavigationIndex(items, 1, "ArrowUp")).toBe(1);
  });

  it("returns an inclusive range in either direction", () => {
    expect(resolveItemRange(2, 4)).toEqual([2, 3, 4]);
    expect(resolveItemRange(4, 2)).toEqual([2, 3, 4]);
  });

  describe("masonry columns of mixed heights", () => {
    // Three columns 200px wide. A, B and C start the columns; E sits under
    // the short B, so it starts before the tall A and C end.
    const masonry: ItemNavigationRect[] = [
      { top: 0, left: 0, width: 200, height: 300 }, // 0 A
      { top: 0, left: 210, width: 200, height: 100 }, // 1 B
      { top: 0, left: 420, width: 200, height: 200 }, // 2 C
      { top: 110, left: 210, width: 200, height: 400 }, // 3 E
      { top: 210, left: 420, width: 200, height: 100 }, // 4 F
      { top: 310, left: 0, width: 200, height: 100 } // 5 G
    ];

    it("moves Down and Up within a column to the item directly below or above", () => {
      expect(resolveItemNavigationIndex(masonry, 1, "ArrowDown")).toBe(3);
      expect(resolveItemNavigationIndex(masonry, 3, "ArrowUp")).toBe(1);
      expect(resolveItemNavigationIndex(masonry, 2, "ArrowDown")).toBe(4);
      expect(resolveItemNavigationIndex(masonry, 0, "ArrowDown")).toBe(5);
      expect(resolveItemNavigationIndex(masonry, 5, "ArrowUp")).toBe(0);
    });

    it("goes to the nearest item below another column, and stops when none is below", () => {
      expect(resolveItemNavigationIndex(masonry, 4, "ArrowDown")).toBe(5);
      expect(resolveItemNavigationIndex(masonry, 3, "ArrowDown")).toBe(3);
    });

    it("moves Left and Right to the nearest item beside it", () => {
      expect(resolveItemNavigationIndex(masonry, 0, "ArrowRight")).toBe(1);
      expect(resolveItemNavigationIndex(masonry, 3, "ArrowLeft")).toBe(5);
      expect(resolveItemNavigationIndex(masonry, 4, "ArrowLeft")).toBe(3);
      expect(resolveItemNavigationIndex(masonry, 3, "ArrowRight")).toBe(4);
      expect(resolveItemNavigationIndex(masonry, 5, "ArrowRight")).toBe(3);
      expect(resolveItemNavigationIndex(masonry, 1, "ArrowLeft")).toBe(0);
    });
  });

  it("moves Down from a short item past a taller neighbour in its row", () => {
    const rows: ItemNavigationRect[] = [
      { top: 0, left: 0, width: 200, height: 200 },
      { top: 0, left: 210, width: 200, height: 100 },
      { top: 210, left: 0, width: 200, height: 100 },
      { top: 210, left: 210, width: 200, height: 100 }
    ];
    expect(resolveItemNavigationIndex(rows, 1, "ArrowDown")).toBe(3);
    expect(resolveItemNavigationIndex(rows, 0, "ArrowDown")).toBe(2);
    expect(resolveItemNavigationIndex(rows, 3, "ArrowLeft")).toBe(2);
  });
});

const popoverMode = vi.hoisted(() => ({ isActual: false }));

vi.mock("@21n/ui/actions/popover.action", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@21n/ui/actions/popover.action")>();
  return {
    ...actual,
    popover: (...args: Parameters<typeof actual.popover>) =>
      popoverMode.isActual
        ? actual.popover(...args)
        : { update: () => undefined, destroy: () => undefined },
    tooltip: () => ({ update: () => undefined, destroy: () => undefined })
  };
});

describe("context menu keys in a shadow root or a frame", () => {
  const menuResolver = () => [
    {
      group: "view",
      items: [],
      option: {
        label: "View",
        options: [
          { value: "side", label: "Side nav" },
          { value: "wall", label: "Wall" }
        ],
        value: "side",
        onChange: () => undefined
      }
    },
    {
      group: "main",
      items: [
        { value: "rename", label: "Rename" },
        { value: "move", label: "Move" },
        { value: "delete", label: "Delete" }
      ]
    }
  ];

  function press(target: Element, key: string) {
    const view = target.ownerDocument.defaultView as Window & typeof globalThis;
    const event = new view.KeyboardEvent("keydown", {
      key,
      bubbles: true,
      composed: true,
      cancelable: true
    });
    target.dispatchEvent(event);
    return event;
  }

  function item(root: ParentNode, value: string) {
    return root.querySelector<HTMLButtonElement>(
      `[data-context-menu-item-id="${value}"]`
    )!;
  }

  function radio(root: ParentNode, value: string) {
    return root.querySelector<HTMLElement>(
      `[role="radio"][data-option-value="${value}"]`
    )!;
  }

  function stubShown(view: Window & typeof globalThis) {
    vi.spyOn(view.Element.prototype, "getClientRects").mockReturnValue([
      {}
    ] as unknown as DOMRectList);
  }

  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
    stubShown(window);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function renderInShadowRoot(props: Record<string, unknown>) {
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const target = document.createElement("div");
    shadow.append(target);
    render(ContextMenu, { target, props: { menuResolver, ...props } });
    return shadow;
  }

  it("leaves arrows on an option radio in a shadow root to the option group", () => {
    const onChange = vi.fn();
    const shadow = renderInShadowRoot({
      menuResolver: () => {
        const groups = menuResolver();
        groups[0].option!.onChange = onChange;
        return groups;
      }
    });
    const side = radio(shadow, "side");
    side.focus();
    expect(shadow.activeElement).toBe(side);

    press(side, "ArrowDown");

    expect(onChange).toHaveBeenCalledWith("wall");
    expect(shadow.activeElement).toBe(radio(shadow, "wall"));
  });

  it("moves focus between items with wrap-around and closes on Escape in a shadow root", () => {
    const onClose = vi.fn();
    const shadow = renderInShadowRoot({ onClose });
    item(shadow, "move").focus();

    press(item(shadow, "move"), "ArrowDown");
    expect(shadow.activeElement).toBe(item(shadow, "delete"));
    press(item(shadow, "delete"), "ArrowDown");
    expect(shadow.activeElement).toBe(radio(shadow, "side"));
    press(item(shadow, "rename"), "ArrowUp");
    expect(shadow.activeElement).toBe(item(shadow, "delete"));

    const escape = press(item(shadow, "delete"), "Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(escape.defaultPrevented).toBe(true);
  });

  it("moves focus and closes on Escape for a menu in a same-origin frame", () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const frameWindow = frame.contentWindow as Window & typeof globalThis;
    const frameDocument = frame.contentDocument!;
    stubShown(frameWindow);
    const target = frameDocument.createElement("div");
    frameDocument.body.append(target);
    const onClose = vi.fn();
    render(ContextMenu, { target, props: { menuResolver, onClose } });

    item(frameDocument, "move").focus();
    expect(frameDocument.activeElement).toBe(item(frameDocument, "move"));

    press(item(frameDocument, "move"), "ArrowUp");
    expect(frameDocument.activeElement).toBe(item(frameDocument, "rename"));
    press(item(frameDocument, "rename"), "ArrowUp");
    expect(frameDocument.activeElement).toBe(radio(frameDocument, "side"));
    press(item(frameDocument, "delete"), "ArrowDown");
    expect(frameDocument.activeElement).toBe(item(frameDocument, "rename"));

    press(item(frameDocument, "rename"), "Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

function pressKey(target: Element, key: string) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    composed: true,
    cancelable: true
  });
  target.dispatchEvent(event);
  return event;
}

function stubMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  );
}

describe("context menu keys with option groups and popovers above the menu", () => {
  const items = [
    { value: "rename", label: "Rename" },
    { value: "insert", label: "Insert" },
    { value: "delete", label: "Delete" }
  ];
  const option = {
    label: "View",
    options: [
      { value: "side", label: "Side nav" },
      { value: "wall", label: "Wall" }
    ],
    value: "side",
    onChange: () => undefined
  };
  const find = (root: ParentNode, selector: string) =>
    root.querySelector<HTMLElement>(selector)!;
  const menuItem = (root: ParentNode, value: string) =>
    find(root, `[data-context-menu-item-id="${value}"]`);
  const optionRadio = (root: ParentNode, value: string) =>
    find(root, `[role="radio"][data-option-value="${value}"]`);

  function addTrigger() {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    return trigger;
  }

  async function open(trigger: HTMLElement) {
    const opened = new Promise<void>((resolve) =>
      trigger.addEventListener("change", (event) => {
        if ((event as CustomEvent<{ open: boolean }>).detail.open) resolve();
      })
    );
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await opened;
  }

  beforeEach(() => {
    stubMatchMedia();
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
      {}
    ] as unknown as DOMRectList);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reaches an option group from the trigger and from items, one stop per group", () => {
    const trigger = addTrigger();
    const target = document.createElement("div");
    document.body.append(target);
    render(ContextMenu, {
      target,
      props: {
        menuResolver: () => [
          { group: "view", items: [], option },
          { group: "main", items }
        ]
      }
    });

    trigger.focus();
    pressKey(trigger, "ArrowDown");
    expect(document.activeElement).toBe(optionRadio(target, "side"));
    menuItem(target, "rename").focus();
    pressKey(menuItem(target, "rename"), "ArrowUp");
    expect(document.activeElement).toBe(optionRadio(target, "side"));
  });

  it("reaches the options of a menu that has only an option group", () => {
    const trigger = addTrigger();
    const target = document.createElement("div");
    document.body.append(target);
    render(ContextMenu, {
      target,
      props: { menuResolver: () => [{ group: "view", items: [], option }] }
    });

    trigger.focus();
    const down = pressKey(trigger, "ArrowDown");
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(optionRadio(target, "side"));
  });

  it("leaves the keys of a popover opened from a menu item to that popover", async () => {
    document.body.innerHTML =
      '<div id="popovers"></div><div id="secondary-popovers"></div>';
    const { popover } = await vi.importActual<
      typeof import("@21n/ui/actions/popover.action")
    >("@21n/ui/actions/popover.action");
    const trigger = addTrigger();
    const onClose = vi.fn();
    const parent = popover(trigger, {
      id: "parent-menu",
      content: ContextMenu as never,
      componentProps: {
        menuResolver: () => [{ group: "main", items }],
        onClose
      }
    });
    await open(trigger);
    const menu = document.getElementById("parent-menu")!;
    const insert = menuItem(menu, "insert");
    const browser = document.createElement("div");
    browser.innerHTML = "<button>Heading</button><button>List</button>";
    const secondary = popover(insert, {
      id: "block-browser",
      content: browser,
      isSecondary: true
    });
    await open(insert);
    const heading = find(browser, "button");

    heading.focus();
    const down = pressKey(heading, "ArrowDown");
    expect(down.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(heading);

    insert.focus();
    expect(pressKey(insert, "ArrowDown").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(menuItem(menu, "delete"));

    expect(pressKey(heading, "Escape").defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    secondary.destroy();
    parent.destroy();
  });
});

describe("item navigation list keys", () => {
  const actions: { destroy: () => void }[] = [];
  const shown = () =>
    Array.from(document.querySelectorAll("[data-item-highlighted]")).map(
      (element) => element.getAttribute("data-id")
    );

  function mountList(
    ids: string[],
    config: Partial<Parameters<typeof itemNavigation>[1]> = {}
  ) {
    const node = document.createElement("div");
    ids.forEach((id, index) => {
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
        ...config
      })
    );
    return node;
  }

  function pointerDown(target: Element) {
    target.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
  }

  beforeEach(() => {
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
      {}
    ] as unknown as DOMRectList);
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    while (actions.length > 0) actions.pop()!.destroy();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("leaves Enter, Space and the menu key to an outside control a pointer pressed, until the next arrow", () => {
    const onOpen = vi.fn();
    const onToggle = vi.fn();
    const onMenu = vi.fn();
    const list = mountList(["a", "b", "c"], { onOpen, onToggle });
    list.addEventListener("itemmenu", onMenu, true);
    pressKey(document.body, "ArrowDown");
    expect(shown()).toEqual(["a"]);

    const button = document.createElement("button");
    const checkbox = document.createElement("button");
    checkbox.setAttribute("role", "checkbox");
    document.body.append(button, checkbox);
    for (const control of [button, checkbox]) {
      pointerDown(control);
      control.focus();
      for (const key of ["Enter", " ", "."])
        expect(pressKey(control, key).defaultPrevented).toBe(false);
    }
    expect(onOpen).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
    expect(onMenu).not.toHaveBeenCalled();
    expect(shown()).toEqual([]);

    pressKey(checkbox, "ArrowDown");
    expect(shown()).toEqual(["b"]);
    expect(pressKey(checkbox, "Enter").defaultPrevented).toBe(true);
    expect(onOpen).toHaveBeenCalledWith(
      list.querySelector("[data-id='b']"),
      expect.anything()
    );
  });

  it("hands the arrows back from another scrolling pane once the URL changes, query or hash included", () => {
    mountList(["a", "b"]);
    const pane = document.createElement("div");
    pane.style.overflowY = "auto";
    Object.defineProperty(pane, "scrollHeight", { value: 500 });
    Object.defineProperty(pane, "clientHeight", { value: 100 });
    const text = document.createElement("p");
    pane.append(text);
    document.body.append(pane);
    const start = location.href;

    try {
      pointerDown(text);
      expect(pressKey(document.body, "ArrowDown").defaultPrevented).toBe(false);
      history.pushState({}, "", "?view=wall");
      expect(pressKey(document.body, "ArrowDown").defaultPrevented).toBe(true);

      pointerDown(text);
      expect(pressKey(document.body, "ArrowDown").defaultPrevented).toBe(false);
      history.pushState({}, "", "#note");
      expect(pressKey(document.body, "ArrowDown").defaultPrevented).toBe(true);
    } finally {
      history.replaceState({}, "", start);
    }
  });

  it("shows one highlight across lists when another list is mounted or clicked", () => {
    const first = mountList(["a1", "a2"]);
    pressKey(document.body, "ArrowDown");
    expect(shown()).toEqual(["a1"]);

    const second = mountList(["b1", "b2"]);
    expect(shown()).toEqual([]);
    pressKey(document.body, "ArrowDown");
    expect(shown()).toEqual(["b1"]);

    pointerDown(second.lastElementChild!);
    mountList(["c1"], {});
    expect(pressKey(document.body, "ArrowDown").defaultPrevented).toBe(true);
    expect(shown()).toEqual(["b1"]);

    pointerDown(first.firstElementChild!);
    pressKey(document.body, "ArrowDown");
    expect(shown()).toEqual(["a1"]);

    pointerDown(second.firstElementChild!);
    expect(shown()).toEqual([]);
  });
});

describe("context menu keys after the menu moves between layers", () => {
  const items = [
    { value: "rename", label: "Rename" },
    { value: "move", label: "Move" },
    { value: "delete", label: "Delete" }
  ];
  const menuItem = (root: ParentNode, value: string) =>
    root.querySelector<HTMLElement>(`[data-context-menu-item-id="${value}"]`)!;

  beforeEach(() => {
    stubMatchMedia();
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
      {}
    ] as unknown as DOMRectList);
    document.body.innerHTML = '<div id="popovers"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps Up, Down and Escape for a mounted menu a popover takes in, and after it leaves", async () => {
    const { popover } = await vi.importActual<
      typeof import("@21n/ui/actions/popover.action")
    >("@21n/ui/actions/popover.action");
    const content = document.createElement("div");
    document.body.append(content);
    const onClose = vi.fn();
    render(ContextMenu, {
      target: content,
      props: { menuResolver: () => [{ group: "main", items }], onClose }
    });
    menuItem(content, "rename").focus();
    pressKey(menuItem(content, "rename"), "ArrowDown");
    expect(document.activeElement).toBe(menuItem(content, "move"));

    const trigger = document.createElement("button");
    document.body.append(trigger);
    const action = popover(trigger, { id: "moved-menu", content });
    const opened = new Promise<void>((resolve) =>
      trigger.addEventListener("change", (event) => {
        if ((event as CustomEvent<{ open: boolean }>).detail.open) resolve();
      })
    );
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await opened;
    expect(document.getElementById("moved-menu")?.contains(content)).toBe(true);

    menuItem(content, "move").focus();
    const down = pressKey(menuItem(content, "move"), "ArrowDown");
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(menuItem(content, "delete"));
    pressKey(menuItem(content, "delete"), "ArrowDown");
    expect(document.activeElement).toBe(menuItem(content, "rename"));
    trigger.focus();
    expect(pressKey(trigger, "ArrowUp").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(menuItem(content, "delete"));
    expect(
      pressKey(menuItem(content, "delete"), "Escape").defaultPrevented
    ).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);

    trigger.dispatchEvent(new CustomEvent("hide"));
    action.destroy();
    document.body.append(content);
    menuItem(content, "rename").focus();
    pressKey(menuItem(content, "rename"), "ArrowUp");
    expect(document.activeElement).toBe(menuItem(content, "delete"));
    expect(
      pressKey(menuItem(content, "delete"), "Escape").defaultPrevented
    ).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("context menu Escape returns focus to the trigger", () => {
  const menuResolver = () => [
    {
      group: "main",
      items: [
        { value: "rename", label: "Rename" },
        { value: "move", label: "Move" }
      ]
    }
  ];
  const menuItem = (value: string) =>
    document.querySelector<HTMLElement>(
      `#popovers [data-context-menu-item-id="${value}"]`
    );

  beforeEach(() => {
    popoverMode.isActual = true;
    stubMatchMedia();
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
      {}
    ] as unknown as DOMRectList);
    document.body.innerHTML = '<div id="popovers"></div>';
  });

  afterEach(() => {
    popoverMode.isActual = false;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function openByClick(id: string) {
    const { getByRole } = render(ContextMenuAction, {
      props: { id, menuResolver }
    });
    const trigger = getByRole("button", { name: "Actions" });
    trigger.focus();
    trigger.click();
    await waitFor(() => expect(menuItem("rename")).not.toBeNull());
    return trigger;
  }

  it("returns focus to the trigger of a menu opened by a click when Escape closes it from an item", async () => {
    const trigger = await openByClick("escapeFocus");
    pressKey(trigger, "ArrowDown");
    expect(document.activeElement).toBe(menuItem("rename"));

    expect(pressKey(menuItem("rename")!, "Escape").defaultPrevented).toBe(true);
    await waitFor(() => expect(menuItem("rename")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("leaves focus the user moved elsewhere when Escape closes the menu", async () => {
    await openByClick("escapeElsewhere");
    const field = document.createElement("button");
    document.body.append(field);
    field.focus();

    pressKey(field, "Escape");
    await waitFor(() => expect(menuItem("rename")).toBeNull());
    expect(document.activeElement).toBe(field);
  });
});

describe("item navigation list reachability and native key owners", () => {
  const actions: { destroy: () => void }[] = [];
  const shown = () =>
    Array.from(document.querySelectorAll("[data-item-highlighted]")).map(
      (element) => element.getAttribute("data-id")
    );

  function mountList(ids: string[]) {
    const node = document.createElement("div");
    ids.forEach((id, index) => {
      const element = document.createElement("div");
      element.id = `thumbnail-${id}`;
      element.dataset.id = id;
      element.getBoundingClientRect = () =>
        ({ top: index * 50, left: 0, width: 100, height: 40 }) as DOMRect;
      node.append(element);
    });
    document.body.append(node);
    actions.push(
      itemNavigation(node, { itemSelector: "[id^='thumbnail-'][data-id]" })
    );
    return node;
  }

  beforeEach(() => {
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
      {}
    ] as unknown as DOMRectList);
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    while (actions.length > 0) actions.pop()!.destroy();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("skips a visibility:hidden list and hidden items in a visible list", () => {
    mountList(["a", "b", "c"]);
    const hiddenList = mountList(["h1", "h2"]);
    hiddenList.style.visibility = "hidden";
    document.querySelector<HTMLElement>("[data-id='b']")!.style.visibility =
      "hidden";

    pressKey(document.body, "ArrowDown");
    expect(shown()).toEqual(["a"]);
    pressKey(document.body, "ArrowDown");
    expect(shown()).toEqual(["c"]);
  });

  it("leaves the arrows to an editable element in any editing mode and to its descendants", () => {
    mountList(["a", "b"]);
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "plaintext-only");
    const word = document.createElement("span");
    editor.append(word);
    document.body.append(editor);
    for (const element of [editor, word])
      Object.defineProperty(element, "isContentEditable", { value: true });

    for (const target of [editor, word])
      for (const key of ["ArrowLeft", "ArrowDown"])
        expect(pressKey(target, key).defaultPrevented).toBe(false);
    expect(shown()).toEqual([]);

    const tab = document.createElement("button");
    document.body.append(tab);
    tab.focus();
    expect(pressKey(tab, "ArrowDown").defaultPrevented).toBe(true);
    expect(shown()).toEqual(["a"]);
  });

  it("leaves the arrows to a text field inside a shadow root", () => {
    mountList(["a", "b"]);
    const host = document.createElement("div");
    document.body.append(host);
    const input = document.createElement("input");
    host.attachShadow({ mode: "open" }).append(input);
    input.focus();

    for (const key of ["ArrowDown", "ArrowRight"])
      expect(pressKey(input, key).defaultPrevented).toBe(false);
    expect(shown()).toEqual([]);
  });
});

describe("keyboard range selection", () => {
  afterEach(() => {
    bulkEditStore.clear();
  });

  it("keeps picks made elsewhere between presses and does not restore removed ones", () => {
    const selectRange = createRangeSelection();
    bulkEditStore.select(["node:base", "node:gone"]);
    selectRange(["node:a", "node:b"], true);
    expect(bulkEditStore.getState().selectedIds).toEqual([
      "node:base",
      "node:gone",
      "node:a",
      "node:b"
    ]);

    bulkEditStore.select(["node:base", "node:a", "node:b", "node:added"]);
    selectRange(["node:a", "node:b", "node:c"], false);
    expect([...bulkEditStore.getState().selectedIds].sort()).toEqual(
      ["node:a", "node:added", "node:b", "node:base", "node:c"].sort()
    );

    selectRange(["node:a"], false);
    expect([...bulkEditStore.getState().selectedIds].sort()).toEqual(
      ["node:a", "node:added", "node:base"].sort()
    );
  });
});
