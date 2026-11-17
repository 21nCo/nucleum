import { render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContextMenu from "@21n/ui/elements/contextMenu/ContextMenu.svelte";
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
    expect(resolveItemNavigationIndex([], undefined, "ArrowDown")).toBe(
      undefined
    );
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

vi.mock("@21n/ui/actions/popover.action", () => ({
  popover: () => ({ update: () => undefined, destroy: () => undefined }),
  tooltip: () => ({ update: () => undefined, destroy: () => undefined })
}));

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
    expect(shadow.activeElement).toBe(item(shadow, "rename"));
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
    expect(frameDocument.activeElement).toBe(item(frameDocument, "delete"));
    press(item(frameDocument, "delete"), "ArrowDown");
    expect(frameDocument.activeElement).toBe(item(frameDocument, "rename"));

    press(item(frameDocument, "rename"), "Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
