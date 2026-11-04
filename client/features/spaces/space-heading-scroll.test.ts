import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scrollToHeading } from "@nucleum/features/spaces/space-heading-scroll";

function createHeading(id: string, tops: () => number) {
  const element = document.createElement("h2");
  element.id = id;
  element.scrollIntoView = vi.fn();
  element.getBoundingClientRect = () => ({ top: tops() }) as DOMRect;
  return element;
}

describe("scrollToHeading", () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
    vi.useRealTimers();
  });

  it("scrolls a heading that renders late and stops once it stays in place", () => {
    const heading = createHeading("heading-1", () => 0);
    scrollToHeading(() => root, "heading-1");
    vi.advanceTimersByTime(300);
    expect(heading.scrollIntoView).not.toHaveBeenCalled();
    root.appendChild(heading);
    vi.advanceTimersByTime(100);
    expect(heading.scrollIntoView).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(heading.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("scrolls again while content above the heading moves it", () => {
    let top = 0;
    const heading = createHeading("heading-1", () => top);
    root.appendChild(heading);
    scrollToHeading(() => root, "heading-1");
    expect(heading.scrollIntoView).toHaveBeenCalledTimes(1);
    top = 120;
    vi.advanceTimersByTime(250);
    expect(heading.scrollIntoView).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(250);
    vi.advanceTimersByTime(250);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("gives up when the heading never renders", () => {
    scrollToHeading(() => root, "missing");
    vi.advanceTimersByTime(5100);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops retrying when cancelled", () => {
    const cancel = scrollToHeading(() => root, "heading-1");
    cancel();
    const heading = createHeading("heading-1", () => 0);
    root.appendChild(heading);
    vi.advanceTimersByTime(1000);
    expect(heading.scrollIntoView).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops retrying when the user scrolls", () => {
    scrollToHeading(() => root, "heading-1");
    window.dispatchEvent(new Event("wheel"));
    const heading = createHeading("heading-1", () => 0);
    root.appendChild(heading);
    vi.advanceTimersByTime(1000);
    expect(heading.scrollIntoView).not.toHaveBeenCalled();
  });
});
