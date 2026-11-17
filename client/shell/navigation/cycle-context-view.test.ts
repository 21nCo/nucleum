import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  contextZone,
  ContextZoneLayer
} from "@nucleum/shell/topNav/contextZone/context-zone";

// The command table imports page components the command under test never
// renders.
vi.mock("@nucleum/shell/notifications/ToastModalPortrait.svelte", () => ({
  default: {}
}));
vi.mock("@nucleum/shell/navigator/Navigator.svelte", () => ({ default: {} }));
vi.mock("@21n/ui/elements/ComingSoonView.svelte", () => ({ default: {} }));

import { shellCommands } from "@nucleum/shell/navigation/global-commands";

const cycle = () => shellCommands.cycle_context_view.fn();

function openSheet() {
  const sheet = document.createElement("div");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  document.body.append(sheet);
  return sheet;
}

describe("V (cycle context view) with a page switcher behind a layer", () => {
  let release: () => void;
  let select: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.body.innerHTML = "";
    select = vi.fn();
    // A resource on the base page registers its tabs as page views.
    release = contextZone.registerViews(
      { id: "base", layer: ContextZoneLayer.BASE },
      { views: { values: ["view", "chat"], active: "view", select } }
    );
  });

  afterEach(() => {
    release();
    document.body.innerHTML = "";
  });

  it("does not switch the covered page's views under an aria-modal sheet", async () => {
    openSheet();
    await cycle();
    expect(select).not.toHaveBeenCalled();
  });

  it("does not switch the covered page's views while a dialog is open", async () => {
    document.body.innerHTML = "<dialog open></dialog>";
    await cycle();
    expect(select).not.toHaveBeenCalled();
  });

  it("switches the page's views once the layer is gone", async () => {
    const sheet = openSheet();
    await cycle();
    sheet.remove();
    await cycle();
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenLastCalledWith("chat");
  });
});
