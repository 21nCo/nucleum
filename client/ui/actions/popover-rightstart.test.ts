import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Placement } from "@21n/ui/elements/direction.enum";
import { PopoverTriggerMethod } from "@21n/ui/actions/popover.type";
import { popover } from "./popover.action";

vi.mock("@21n/ui/elements/markdown/markdown.utils", () => ({
  renderMdAsHtml: (value: string) => value
}));

const SUBMENU_HEIGHT = 300;
const SUBMENU_WIDTH = 200;

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({})
  } as DOMRect;
}

function defineSize(element: HTMLElement, key: string, value: number) {
  Object.defineProperty(element, key, { configurable: true, value });
}

describe("popover start-aligned placement", () => {
  let boundingRect: typeof HTMLElement.prototype.getBoundingClientRect;
  let triggerTop = 0;
  let triggerLeft = 100;

  beforeEach(() => {
    document.body.innerHTML = '<div id="popovers"></div>';
    Object.defineProperty(window, "innerWidth", {
      value: 1280,
      configurable: true
    });
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      configurable: true
    });
    defineSize(document.documentElement, "clientWidth", 1280);
    defineSize(document.documentElement, "scrollHeight", 2400);
    boundingRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      if (this.classList.contains("popover")) {
        const left = parseFloat(this.style.left) || 0;
        const top = parseFloat(this.style.top) || 0;
        return rect(left, top, SUBMENU_WIDTH, SUBMENU_HEIGHT);
      }
      if (this.dataset.trigger) return rect(triggerLeft, triggerTop, 240, 32);
      return rect(0, 0, 0, 0);
    };
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = boundingRect;
    delete (document.documentElement as any).clientWidth;
    delete (document.documentElement as any).scrollHeight;
    document.body.innerHTML = "";
  });

  async function openSubmenu(top: number, left = 100) {
    triggerTop = top;
    triggerLeft = left;
    const trigger = document.createElement("button");
    trigger.dataset.trigger = "true";
    document.body.append(trigger);
    const action = popover(trigger, {
      id: "submenu",
      content: "options",
      placement: Placement.RightStart,
      offsetInPx: 12,
      triggerMethod: [PopoverTriggerMethod.CLICK]
    });
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const element = await vi.waitFor(() => {
      const shown = document.querySelector<HTMLElement>(".popover");
      expect(shown?.style.opacity).toBe("1");
      return shown!;
    });
    return { action, element };
  }

  it("keeps a submenu opened near the bottom inside the viewport of a scrolling document", async () => {
    const { action, element } = await openSubmenu(600);

    const top = parseFloat(element.style.top);
    expect(top + SUBMENU_HEIGHT).toBeLessThanOrEqual(window.innerHeight);
    expect(top).toBeGreaterThanOrEqual(6);
    action.destroy();
  });

  it("keeps a submenu that fits aligned with its row", async () => {
    const { action, element } = await openSubmenu(100);

    expect(parseFloat(element.style.top)).toBe(100 - 12);
    expect(parseFloat(element.style.left)).toBe(100 + 240 + 12);
    action.destroy();
  });

  it("opens to the left of a row near the right edge", async () => {
    const { action, element } = await openSubmenu(100, 1000);

    expect(element.style.left).toBe("");
    expect(parseFloat(element.style.right)).toBe(1280 - 1000 + 12);
    action.destroy();
  });
});
