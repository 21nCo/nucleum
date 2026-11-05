import { render } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import { get, type Readable } from "svelte/store";
import ContextZonePaneScope from "@nucleum/shell/topNav/contextZone/ContextZonePaneScope.svelte";
import {
  ContextZoneLayer,
  contextZone
} from "@nucleum/shell/topNav/contextZone/context-zone";
import {
  resolveHostVisibility,
  setRightPanelSheetShown
} from "@nucleum/shell/rightPanel/right-panel-visibility";

function renderInLayer(layer: number) {
  let visibility: Readable<boolean> | undefined;
  const children = (() => {
    visibility = resolveHostVisibility();
  }) as never;
  render(ContextZonePaneScope, { props: { id: "probe", layer, children } });
  return visibility!;
}

afterEach(() => {
  contextZone.setVisibleLayers(undefined);
  setRightPanelSheetShown(false);
});

describe("resolveHostVisibility", () => {
  it("hides a page tool while an overlay is drawn over the page", () => {
    const visibility = renderInLayer(ContextZoneLayer.PAGE);
    contextZone.setVisibleLayers([
      ContextZoneLayer.PAGE,
      ContextZoneLayer.BESIDE_PAGE
    ]);
    expect(get(visibility)).toBe(true);

    contextZone.setVisibleLayers([ContextZoneLayer.OVERLAY]);
    expect(get(visibility)).toBe(false);
  });

  it("hides a base page tool under a full-screen overlay", () => {
    const visibility = renderInLayer(ContextZoneLayer.BASE);
    contextZone.setVisibleLayers([ContextZoneLayer.OVERLAY]);
    expect(get(visibility)).toBe(false);

    contextZone.setVisibleLayers([
      ContextZoneLayer.BASE,
      ContextZoneLayer.BESIDE_BASE
    ]);
    expect(get(visibility)).toBe(true);
  });

  it("counts every layer as visible when no layout reports visible layers", () => {
    expect(get(renderInLayer(ContextZoneLayer.PAGE))).toBe(true);
  });

  it("hides a page tool while a right panel sheet covers the main region", () => {
    const visibility = renderInLayer(ContextZoneLayer.PAGE);
    contextZone.setVisibleLayers([
      ContextZoneLayer.PAGE,
      ContextZoneLayer.BESIDE_PAGE
    ]);
    setRightPanelSheetShown(true);
    expect(get(visibility)).toBe(false);

    setRightPanelSheetShown(false);
    expect(get(visibility)).toBe(true);
  });
});
