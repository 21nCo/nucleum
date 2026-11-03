import { get } from "svelte/store";
import { describe, expect, it } from "vitest";
import { contextZone } from "./context-zone";

const content = (() => {}) as any;

describe("context zone surface", () => {
  it("exposes the surface a registration declares, live", () => {
    const registration = { content, surface: "bg-bgs2" };
    const release = contextZone.register(
      { id: "surface-test", layer: 0 },
      registration
    );
    const entry = get(contextZone.entries).find(
      (item) => item.pane.id === "surface-test"
    );
    expect(entry?.surface).toBe("bg-bgs2");
    registration.surface = "bg-bgs3";
    expect(entry?.surface).toBe("bg-bgs3");
    release();
  });

  it("leaves the surface undefined when none is declared", () => {
    const release = contextZone.register(
      { id: "surface-default", layer: 0 },
      { content }
    );
    const entry = get(contextZone.entries).find(
      (item) => item.pane.id === "surface-default"
    );
    expect(entry?.surface).toBeUndefined();
    release();
  });
});
