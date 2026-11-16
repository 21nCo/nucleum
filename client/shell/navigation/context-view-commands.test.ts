import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ step: vi.fn() }));

vi.mock("@nucleum/shell/topNav/contextZone/context-zone", () => ({
  contextZone: { step: mocks.step, cycle: vi.fn() }
}));

// The command table imports page components the commands under test never
// render.
vi.mock("@nucleum/shell/notifications/ToastModalPortrait.svelte", () => ({
  default: {}
}));
vi.mock("@nucleum/shell/navigator/Navigator.svelte", () => ({ default: {} }));
vi.mock("@21n/ui/elements/ComingSoonView.svelte", () => ({ default: {} }));

import { shellCommands } from "@nucleum/shell/navigation/global-commands";

const previous = () => shellCommands.previous_context_view.fn();
const next = () => shellCommands.next_context_view.fn();

function openPopover() {
  const popover = document.createElement("div");
  popover.className = "popover";
  // jsdom lays out nothing, so give the popover a box to count as shown.
  popover.getClientRects = () =>
    [{ width: 10, height: 10 }] as unknown as DOMRectList;
  document.body.append(popover);
}

describe("Option arrow context view commands", () => {
  beforeEach(() => {
    mocks.step.mockClear();
    document.body.innerHTML = "";
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("steps backward and forward with nothing in front", async () => {
    await previous();
    await next();
    expect(mocks.step.mock.calls).toEqual([[-1], [1]]);
  });

  it("does not step while a dialog is open", async () => {
    document.body.innerHTML = "<dialog open></dialog>";
    await previous();
    await next();
    expect(mocks.step).not.toHaveBeenCalled();
  });

  it("does not step while a popover is shown", async () => {
    openPopover();
    await previous();
    await next();
    expect(mocks.step).not.toHaveBeenCalled();
  });

  it("does not step while a modal is in front", async () => {
    document.body.innerHTML = '<div data-blank-modal="0"></div>';
    await next();
    expect(mocks.step).not.toHaveBeenCalled();
  });
});
