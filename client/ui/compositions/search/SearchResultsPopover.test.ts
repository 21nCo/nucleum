import { cleanup, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SearchResultsPopover from "./SearchResultsPopover.svelte";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SearchResultsPopover loading state", () => {
  it("settles to the empty state when no keystroke reaches the popover", async () => {
    vi.useFakeTimers();
    const searchCallback = vi.fn().mockResolvedValue([]);
    const { findByText, queryByText } = render(SearchResultsPopover, {
      searchCallback,
      isAlwaysShowSearchFeedback: true
    });
    expect(queryByText("Searching...")).not.toBeNull();
    await vi.advanceTimersByTimeAsync(600);
    expect(searchCallback).toHaveBeenCalledWith("");
    vi.useRealTimers();
    expect(await findByText("No results found")).toBeTruthy();
    expect(queryByText("Searching...")).toBeNull();
  });

  it("ends a search that never settles in the empty state", async () => {
    vi.useFakeTimers();
    const searchCallback = vi.fn(() => new Promise(() => {}));
    const { findByText, queryByText } = render(SearchResultsPopover, {
      searchCallback,
      isAlwaysShowSearchFeedback: true
    });
    await vi.advanceTimersByTimeAsync(600);
    expect(queryByText("Searching...")).not.toBeNull();
    await vi.advanceTimersByTimeAsync(10_000);
    vi.useRealTimers();
    expect(await findByText("No results found")).toBeTruthy();
  });

  it("shows results returned by the initial search", async () => {
    vi.useFakeTimers();
    const searchCallback = vi
      .fn()
      .mockResolvedValue([{ id: "node:a", label: "Verify page one" }]);
    const { findByText } = render(SearchResultsPopover, {
      searchCallback,
      isAlwaysShowSearchFeedback: true
    });
    await vi.advanceTimersByTimeAsync(600);
    vi.useRealTimers();
    expect(await findByText("Verify page one")).toBeTruthy();
  });
});
