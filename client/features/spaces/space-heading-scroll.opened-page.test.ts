import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  scrollOpenedPageToHeading,
  stopOpenedPageHeadingScroll
} from "@nucleum/features/spaces/space-heading-scroll";
import { PAGE_LAYER_ATTRIBUTE } from "@nucleum/shell/navigation/page-layer";

function heading(id: string) {
  const element = document.createElement("h2");
  element.id = id;
  element.scrollIntoView = vi.fn();
  element.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  return element;
}

function pageLayer(...children: HTMLElement[]) {
  const layer = document.createElement("div");
  layer.setAttribute(PAGE_LAYER_ATTRIBUTE, "");
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
    const first = heading("heading-a");
    const second = heading("heading-b");
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
