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

describe("RightPanel", () => {
  beforeAll(() => {
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
});
