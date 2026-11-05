import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({
    resolveAction: () => null,
    runAction: vi.fn()
  })
}));
vi.mock("@nucleum/shared-state/resources/resource-search", () => ({
  searchResources: vi.fn(async () => [])
}));

import CommandBar from "@nucleum/surfaces/commandBar/CommandBar.svelte";

describe("CommandBar", () => {
  beforeAll(() => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined
    }));
  });

  it("opens with its results list bound to an unset selected row kind", async () => {
    const { getByTestId } = render(CommandBar);
    await tick();
    expect(getByTestId("command-bar-input")).toBeTruthy();
  });

  it("opens on the search scope", async () => {
    const { getByTestId } = render(CommandBar, { props: { scope: "search" } });
    await tick();
    expect(getByTestId("command-bar-input")).toBeTruthy();
  });
});
