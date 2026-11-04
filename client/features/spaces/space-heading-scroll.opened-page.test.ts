import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  scrollOpenedPageToHeading,
  stopOpenedPageHeadingScroll
} from "@nucleum/features/spaces/space-heading-scroll";

function heading(id: string) {
  const element = document.createElement("h2");
  element.id = id;
  element.scrollIntoView = vi.fn();
  element.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  return element;
}

function pageLayer(...children: HTMLElement[]) {
  const layer = document.createElement("div");
  layer.setAttribute("data-page-layer", "");
  layer.append(...children);
  return layer;
}

describe("scrollOpenedPageToHeading", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopOpenedPageHeadingScroll();
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("keeps one pending scroll, replacing an earlier one", () => {
    scrollOpenedPageToHeading("heading-a");
    scrollOpenedPageToHeading("heading-b");
    const first = document.createElement("h2");
    first.id = "heading-a";
    first.scrollIntoView = vi.fn();
    first.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    const second = document.createElement("h2");
    second.id = "heading-b";
    second.scrollIntoView = vi.fn();
    second.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    document.body.append(pageLayer(first, second));
    vi.advanceTimersByTime(200);
    expect(first.scrollIntoView).not.toHaveBeenCalled();
    expect(second.scrollIntoView).toHaveBeenCalled();
  });

  it("scrolls the heading in the opened page, not a copy shown beneath it", () => {
    scrollOpenedPageToHeading("heading-a");
    const covered = heading("heading-a");
    const opened = heading("heading-a");
    document.body.append(covered, pageLayer(opened));
    vi.advanceTimersByTime(200);
    expect(covered.scrollIntoView).not.toHaveBeenCalled();
    expect(opened.scrollIntoView).toHaveBeenCalled();
  });

  it("stops the pending scroll on request", () => {
    scrollOpenedPageToHeading("heading-a");
    stopOpenedPageHeadingScroll();
    expect(vi.getTimerCount()).toBe(0);
  });
});
