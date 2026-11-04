import { afterEach, describe, expect, it, vi } from "vitest";
import {
  forgetPageScroll,
  restorePageScroll,
  savePageScroll
} from "./page-scroll";

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

function page(...children: HTMLElement[]) {
  const root = document.createElement("div");
  children.forEach((child) => root.appendChild(child));
  return root;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("page scroll", () => {
  it("restores the offset of the element that scrolled", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "Date"] });
    const id = "node:scrolled";
    const list = scrollable(300);
    savePageScroll(page(scrollable(0), list), id, list);

    const restored = scrollable(0);
    const stop = restorePageScroll(page(scrollable(0), restored), id);
    vi.advanceTimersToNextFrame();
    expect(restored.scrollTop).toBe(300);
    stop();
    forgetPageScroll(id);
  });

  it("drops an element scrolled back to the top", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "Date"] });
    const id = "node:top";
    const list = scrollable(300);
    const root = page(list);
    savePageScroll(root, id, list);
    list.scrollTop = 0;
    savePageScroll(root, id, list);

    const restored = scrollable(0);
    const stop = restorePageScroll(page(restored), id);
    vi.advanceTimersToNextFrame();
    expect(restored.scrollTop).toBe(0);
    stop();
  });

  it("keeps only the most recently scrolled pages", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "Date"] });
    for (let index = 0; index <= 50; index++) {
      const list = scrollable(100);
      savePageScroll(page(list), `node:${index}`, list);
    }
    const oldest = scrollable(0);
    const stopOldest = restorePageScroll(page(oldest), "node:0");
    const newest = scrollable(0);
    const stopNewest = restorePageScroll(page(newest), "node:50");
    vi.advanceTimersToNextFrame();
    expect(oldest.scrollTop).toBe(0);
    expect(newest.scrollTop).toBe(100);
    stopOldest();
    stopNewest();
  });
});
