import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import { createContextZoneSlot } from "./context-zone";
import { resolveContextZoneSubject } from "./context-zone-subject";
import { ContextZoneLayer } from "./context-zone";

const content = (() => {}) as any;

describe("createContextZoneSlot", () => {
  it("collects registrations until they unregister", () => {
    const slot = createContextZoneSlot();
    const release = slot.register({ content });
    expect(get(slot.entries)).toHaveLength(1);
    release();
    expect(get(slot.entries)).toHaveLength(0);
  });

  it("cycles the newest collected entry", () => {
    const slot = createContextZoneSlot();
    const first = vi.fn();
    const second = vi.fn();
    slot.register({ content, cycle: first });
    slot.register({ content, cycle: second });
    expect(slot.cycle()).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it("reports when nothing can cycle", () => {
    const slot = createContextZoneSlot();
    slot.register({ content });
    expect(slot.cycle()).toBe(false);
  });
});

describe("resolveContextZoneSubject for spaces", () => {
  it("resolves a space base page to its root space", () => {
    expect(
      resolveContextZoneSubject(
        { id: "base", layer: ContextZoneLayer.BASE },
        new URL("https://local.nucleum.app/space/abc/def")
      )
    ).toEqual({ kind: "resource", id: "space:abc" });
  });
});
