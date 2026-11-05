import { describe, expect, it } from "vitest";
import { ContextZoneLayer, resolveVisiblePanes } from "./context-zone";

describe("resolveVisiblePanes", () => {
  const base = { id: "base", layer: ContextZoneLayer.BASE };
  const beside = { id: "beside", layer: ContextZoneLayer.BESIDE_BASE };
  const page = { id: "page", layer: ContextZoneLayer.PAGE };

  it("keeps panes on visible layers once each", () => {
    expect(
      resolveVisiblePanes(
        [
          { key: 1, pane: base },
          { key: 2, pane: beside },
          { key: 3, pane: beside },
          { key: 4, pane: page }
        ],
        new Set([ContextZoneLayer.BASE, ContextZoneLayer.BESIDE_BASE])
      )
    ).toEqual([base, beside]);
  });

  it("keeps every pane without visible layers", () => {
    expect(resolveVisiblePanes([{ key: 1, pane: page }])).toEqual([page]);
  });
});
