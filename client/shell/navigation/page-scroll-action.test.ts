import { afterEach, describe, expect, it, vi } from "vitest";
import { forgetPageScroll, pageScroll } from "./page-scroll";

function scrollable(top: number) {
  const element = document.createElement("div");
  let scrollTop = top;
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    }
  });
  Object.defineProperty(element, "scrollHeight", { value: 5000 });
  Object.defineProperty(element, "clientHeight", { value: 500 });
  return element;
}

function render(root: HTMLElement, top: number) {
  const list = scrollable(top);
  root.replaceChildren(list);
  return list;
}

afterEach(() => {
  vi.useRealTimers();
  forgetPageScroll("node:a");
  forgetPageScroll("node:b");
});

describe("pageScroll", () => {
  it("returns a page to its scroll position when it renders again", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "Date"] });
    const root = document.createElement("div");
    const first = render(root, 0);
    const action = pageScroll(root, "node:a");
    first.scrollTop = 320;
    first.dispatchEvent(new Event("scroll"));

    render(root, 0);
    action.update("node:b");
    vi.advanceTimersToNextFrame();

    const again = render(root, 0);
    action.update("node:a");
    vi.advanceTimersToNextFrame();
    expect(again.scrollTop).toBe(320);
    action.destroy();
  });

  it("stops saving once destroyed", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "Date"] });
    const root = document.createElement("div");
    const list = render(root, 0);
    const action = pageScroll(root, "node:a");
    action.destroy();
    list.scrollTop = 200;
    list.dispatchEvent(new Event("scroll"));

    const restoredRoot = document.createElement("div");
    const restored = render(restoredRoot, 0);
    const next = pageScroll(restoredRoot, "node:a");
    vi.advanceTimersToNextFrame();
    expect(restored.scrollTop).toBe(0);
    next.destroy();
  });
});
