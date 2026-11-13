import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get, writable } from "svelte/store";
import { delayedSyncVisibility } from "./sync-visibility";

describe("delayedSyncVisibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const syncing = writable(false);
    const visible = delayedSyncVisibility(syncing, 700, 400);
    const values: boolean[] = [];
    const stop = visible.subscribe((value) => values.push(value));
    return { syncing, visible, values, stop };
  }

  it("never shows a sync shorter than the delay", () => {
    const { syncing, visible, values, stop } = setup();
    syncing.set(true);
    vi.advanceTimersByTime(300);
    syncing.set(false);
    vi.advanceTimersByTime(2000);
    expect(get(visible)).toBe(false);
    expect(values).toEqual([false]);
    stop();
  });

  it("shows a sync that lasts past the delay", () => {
    const { syncing, visible, stop } = setup();
    syncing.set(true);
    vi.advanceTimersByTime(699);
    expect(get(visible)).toBe(false);
    vi.advanceTimersByTime(1);
    expect(get(visible)).toBe(true);
    stop();
  });

  it("keeps a shown indicator for the minimum time after the sync ends", () => {
    const { syncing, visible, stop } = setup();
    syncing.set(true);
    vi.advanceTimersByTime(750);
    syncing.set(false);
    vi.advanceTimersByTime(349);
    expect(get(visible)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(get(visible)).toBe(false);
    stop();
  });

  it("hides right away when the sync ran longer than the minimum after showing", () => {
    const { syncing, visible, stop } = setup();
    syncing.set(true);
    vi.advanceTimersByTime(700 + 500);
    syncing.set(false);
    vi.advanceTimersByTime(0);
    expect(get(visible)).toBe(false);
    stop();
  });

  it("restarts the delay for each separate quick sync", () => {
    const { syncing, visible, stop } = setup();
    for (let i = 0; i < 5; i++) {
      syncing.set(true);
      vi.advanceTimersByTime(400);
      syncing.set(false);
      vi.advanceTimersByTime(100);
    }
    expect(get(visible)).toBe(false);
    stop();
  });

  it("stays visible when a new sync starts during the minimum display", () => {
    const { syncing, visible, stop } = setup();
    syncing.set(true);
    vi.advanceTimersByTime(800);
    syncing.set(false);
    vi.advanceTimersByTime(100);
    syncing.set(true);
    vi.advanceTimersByTime(1000);
    expect(get(visible)).toBe(true);
    stop();
  });

  it("resets to hidden when the last subscriber leaves while visible", () => {
    const { syncing, visible, stop } = setup();
    syncing.set(true);
    vi.advanceTimersByTime(800);
    syncing.set(false);
    expect(get(visible)).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    stop();
    expect(vi.getTimerCount()).toBe(0);

    const values: boolean[] = [];
    const stopAgain = visible.subscribe((value) => values.push(value));
    vi.advanceTimersByTime(2000);
    expect(values).toEqual([false]);
    expect(get(visible)).toBe(false);
    stopAgain();
  });
});
