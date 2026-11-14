import { fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  Element.prototype.animate = (() => ({
    cancel: () => undefined,
    finished: Promise.resolve()
  })) as never;
});

vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

import {
  toastDefaultDuration,
  toasts
} from "@nucleum/shared-state/notifications/notification.store";
import TopNavToasts from "./TopNavToasts.svelte";

const messages = () => get(toasts).map((toast) => toast.message);

async function flush() {
  await tick();
  await Promise.resolve();
  await tick();
}

describe("TopNavToasts keyboard focus", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  });

  afterEach(() => {
    toasts.reset();
    vi.useRealTimers();
  });

  it("keeps toasts while focus is on them and lets them expire after focus leaves", async () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    toasts.success("Link copied");
    const { getByTestId } = render(TopNavToasts);
    await flush();

    getByTestId("top-bar-toast-dismiss").focus();
    await flush();
    vi.advanceTimersByTime(toastDefaultDuration * 2);
    expect(messages()).toEqual(["Link copied"]);

    outside.focus();
    await flush();
    vi.advanceTimersByTime(toastDefaultDuration);
    expect(messages()).toEqual([]);
  });

  it("lets the remaining toast expire when the focused list row is dismissed", async () => {
    toasts.success("First");
    toasts.success("Second");
    const { getByTestId, getByRole } = render(TopNavToasts);
    await flush();

    await fireEvent.click(getByTestId("top-bar-toast-count"));
    await flush();
    const rowDismiss = [
      ...getByTestId("top-bar-toast-list").querySelectorAll("button")
    ][0];
    rowDismiss.focus();
    await flush();
    await fireEvent.click(rowDismiss);
    await flush();
    expect(messages()).toEqual(["First"]);
    expect(getByRole("group").contains(document.activeElement)).toBe(false);

    vi.advanceTimersByTime(toastDefaultDuration);
    expect(messages()).toEqual([]);
  });

  it("shows the latest toast's close button while the list is open without hover", async () => {
    toasts.success("First");
    toasts.success("Second");
    const { getByTestId } = render(TopNavToasts);
    await flush();
    const close = getByTestId("top-bar-toast-dismiss");
    expect(close.className).toContain("opacity-0");

    await fireEvent.click(getByTestId("top-bar-toast-count"));
    await flush();
    expect(getByTestId("top-bar-toast-list")).toBeTruthy();
    expect(document.activeElement).toBe(document.body);
    expect(close.className).not.toContain("opacity-0");

    await fireEvent.click(close);
    await flush();
    expect(messages()).toEqual(["First"]);
  });

  it("bounds and centres the raised list in its host instead of the toast", async () => {
    toasts.success("First");
    toasts.success("Second");
    const { getByTestId } = render(TopNavToasts, { props: { isRaised: true } });
    await flush();
    await fireEvent.click(getByTestId("top-bar-toast-count"));
    await flush();

    expect(getByTestId("top-bar-toasts").className).not.toContain("relative");
    const list = getByTestId("top-bar-toast-list").className;
    expect(list).toContain("max-w-[calc(100%-1rem)]");
    expect(list).toContain("left-1/2");
    expect(list).not.toContain("right-0");
  });
});
