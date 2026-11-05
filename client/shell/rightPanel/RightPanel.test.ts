import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeAll, describe, expect, it, vi } from "vitest";

const resolver = vi.hoisted(() => vi.fn());

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { toggleSearchParam: vi.fn() }
}));
vi.mock("@nucleum/shared-state/resources/action-renderer", () => ({
  requireActionRenderer: () => resolver
}));

import RightPanel from "@nucleum/shell/rightPanel/RightPanel.svelte";
import { resolveHostVisibility } from "@nucleum/shell/rightPanel/right-panel-visibility";
import { get, type Readable } from "svelte/store";

describe("RightPanel", () => {
  beforeAll(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    Element.prototype.animate = vi.fn(() => ({
      cancel: () => undefined,
      finished: Promise.resolve()
    })) as never;
  });

  it("keeps the tool mounted when the panel turns into a sheet and back", async () => {
    const action = { action: "capture", label: "Capture" } as never;
    const { rerender, queryByRole } = render(RightPanel, {
      props: { action, isSheet: false }
    });
    expect(queryByRole("dialog")).toBe(null);

    await rerender({ action, isSheet: true });
    await tick();
    expect(queryByRole("dialog", { name: "Capture" })).toBeTruthy();

    await rerender({ action, isSheet: false });
    await tick();
    expect(queryByRole("dialog")).toBe(null);
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(resolver.mock.calls[0][1]).toMatchObject({ path: "capture" });
  });

  it("keeps focus in the tool when the sheet turns into a panel", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const action = { action: "capture", label: "Capture" } as never;
    const { rerender, getByRole } = render(RightPanel, {
      props: { action, isSheet: true }
    });
    const input = document.createElement("input");
    getByRole("dialog").append(input);
    input.focus();

    await rerender({ action, isSheet: false });
    await tick();
    await Promise.resolve();
    expect(document.activeElement).toBe(input);
    opener.remove();
  });

  it("hides a suspended sheet without unmounting its tool", async () => {
    resolver.mockClear();
    const action = { action: "capture", label: "Capture" } as never;
    const { rerender, container, queryByRole } = render(RightPanel, {
      props: { action, isSheet: true }
    });
    await rerender({ action, isSheet: true, isSuspended: true });
    await tick();
    const sheet = container.querySelector<HTMLElement>("[hidden]");
    expect(sheet?.style.display).toBe("none");
    expect(queryByRole("dialog")).toBe(null);

    await rerender({ action, isSheet: true, isSuspended: false });
    await tick();
    expect(queryByRole("dialog", { name: "Capture" })).toBeTruthy();
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it("returns focus to its opener when it closes after a suspension", async () => {
    const opener = document.createElement("button");
    const overlayInput = document.createElement("input");
    document.body.append(opener, overlayInput);
    opener.focus();
    const action = { action: "capture", label: "Capture" } as never;
    const { rerender, unmount } = render(RightPanel, {
      props: { action, isSheet: true }
    });
    await rerender({ action, isSheet: true, isSuspended: true });
    overlayInput.focus();
    await rerender({ action, isSheet: true, isSuspended: false });
    await tick();

    unmount();
    await Promise.resolve();
    expect(document.activeElement).toBe(opener);
    opener.remove();
    overlayInput.remove();
  });

  it("tells its tool that it is hidden while suspended", async () => {
    let visibility: Readable<boolean> | undefined;
    resolver.mockImplementationOnce(() => {
      visibility = resolveHostVisibility();
    });
    const action = { action: "capture", label: "Capture" } as never;
    const { rerender } = render(RightPanel, {
      props: { action, isSheet: false }
    });
    await tick();
    expect(get(visibility!)).toBe(true);

    await rerender({ action, isSheet: false, isSuspended: true });
    await tick();
    expect(get(visibility!)).toBe(false);

    await rerender({ action, isSheet: false, isSuspended: false });
    await tick();
    expect(get(visibility!)).toBe(true);
  });

  it("tells a tool mounted under a covering layer that it is hidden", () => {
    let isVisible: boolean | undefined;
    resolver.mockImplementationOnce(() => {
      isVisible = get(resolveHostVisibility());
    });
    const action = { action: "capture", label: "Capture" } as never;
    render(RightPanel, {
      props: { action, isSheet: false, isSuspended: true }
    });
    expect(isVisible).toBe(false);
  });
});
