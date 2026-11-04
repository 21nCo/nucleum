import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  scrollOpenedPageToHeading,
  stopOpenedPageHeadingScroll
} from "@nucleum/features/spaces/space-heading-scroll";

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
    document.body.append(first, second);
    vi.advanceTimersByTime(200);
    expect(first.scrollIntoView).not.toHaveBeenCalled();
    expect(second.scrollIntoView).toHaveBeenCalled();
  });

  it("stops the pending scroll on request", () => {
    scrollOpenedPageToHeading("heading-a");
    stopOpenedPageHeadingScroll();
    expect(vi.getTimerCount()).toBe(0);
  });
});
