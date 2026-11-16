import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tick } from "svelte";
import { writable } from "svelte/store";
import { NodeBirdViewMode } from "@nucleum/features/memory/node/birdView/birdView.type";
import {
  BASE_CONTEXT_ZONE_PANE,
  contextZone,
  type ContextZoneSubViewRegistration
} from "@nucleum/shell/topNav/contextZone/context-zone";

vi.mock("@datafn/svelte", async () => {
  const { readable } = await import("svelte/store");
  return {
    toSvelteStore: () => readable({ data: [], loading: false })
  };
});
vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: {
    linkTag: { signal: () => ({}) },
    node: { signal: () => ({}) }
  }
}));
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: {}
}));
vi.mock("@nucleum/features/memory/graph/NodeGraph.svelte", () => ({
  default: () => {}
}));
vi.mock(
  "@nucleum/features/memory/node/timeline/NodeTimelineView.svelte",
  () => ({
    default: () => {}
  })
);
vi.mock(
  "@nucleum/features/memory/node/rightPanel/NodeRightPaneContent.svelte",
  () => ({ default: () => {} })
);

import NodeBirdView from "@nucleum/features/memory/node/birdView/NodeBirdView.svelte";

let competitor: ContextZoneSubViewRegistration | undefined;
let view: ReturnType<typeof render> | undefined;
const competitorSelect = vi.fn();

function registerCompetitor() {
  competitor = contextZone.registerSubViews(BASE_CONTEXT_ZONE_PANE, {
    views: { values: ["a", "b"], active: "a", select: competitorSelect }
  });
}

async function renderBirdView() {
  const node = Object.assign(writable({ id: "node-1", links: [] }), {
    id: "node-1",
    switchPanel: vi.fn()
  });
  view = render(NodeBirdView, { props: { node: node as never } });
  await tick();
}

function modeButton(label: string) {
  return screen.getByRole("button", { name: label });
}

beforeEach(() => {
  competitorSelect.mockClear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  competitor?.release();
  competitor = undefined;
  view?.unmount();
  view = undefined;
});

describe("NodeBirdView mode sub switcher", () => {
  it("leaves the keys on the newest switcher until a mode is picked", async () => {
    await renderBirdView();
    registerCompetitor();

    expect(contextZone.stepSub(1)).toBe(true);
    expect(competitorSelect).toHaveBeenCalledWith("b");
  });

  it("follows the mode switcher after the active mode is picked again", async () => {
    await renderBirdView();
    registerCompetitor();

    await fireEvent.click(modeButton("Graph"));

    expect(contextZone.stepSub(1)).toBe(true);
    expect(competitorSelect).not.toHaveBeenCalled();
    expect(contextZone.resolveSubViews()?.active).toBe(
      NodeBirdViewMode.Timeline
    );
  });

  it("follows the mode switcher after another mode is picked", async () => {
    await renderBirdView();
    registerCompetitor();

    await fireEvent.click(modeButton("Timeline"));

    expect(contextZone.stepSub(1)).toBe(true);
    expect(competitorSelect).not.toHaveBeenCalled();
    expect(contextZone.resolveSubViews()?.active).toBe(NodeBirdViewMode.Graph);
  });
});
