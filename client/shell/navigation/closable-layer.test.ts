import { describe, expect, it, vi } from "vitest";
import { hasClosableLayer } from "./navigation";

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: () => [], setState: () => undefined }
}));
vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return { datafn: {}, datafnRuntime: writable(undefined) };
});

describe("hasClosableLayer", () => {
  it("reports pages, splits and overlays as closable layers", () => {
    for (const search of [
      "page=node:a",
      "besidePage=node:b",
      "beside=node:c",
      "overlay=search"
    ]) {
      expect(hasClosableLayer(new URLSearchParams(search))).toBe(true);
    }
  });

  it("does not treat the right panel or full screen alone as a layer", () => {
    expect(hasClosableLayer(new URLSearchParams("panel=navigator"))).toBe(
      false
    );
    expect(hasClosableLayer(new URLSearchParams("max=true"))).toBe(false);
  });
});
