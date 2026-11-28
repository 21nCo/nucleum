import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { get } from "svelte/store";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/shared-state/resources/action-renderer", async () => {
  const stub =
    await import("@tests/fixtures/components/ActionRendererStub.svelte");
  return { requireActionRenderer: () => stub.default };
});

import ResourceResolver from "./ResourceResolver.svelte";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
import { BASE_CONTEXT_ZONE_PANE } from "@nucleum/shell/topNav/contextZone/context-zone";

let release: (() => void) | undefined;

afterEach(() => {
  release?.();
  release = undefined;
});

describe("resource page command context", () => {
  it.each(["task", "session", "event"])(
    "registers %s identity without requiring its own menu",
    async (resource) => {
      const view = render(ResourceResolver, {
        id: `${resource}:1`,
        accessMode: AccessMode.PAGE
      });
      await tick();
      expect(get(contextActions.active)).toMatchObject({
        id: `${resource}:1`,
        resource
      });
      await view.rerender({ id: `${resource}:2`, accessMode: AccessMode.PAGE });
      expect(get(contextActions.active)?.id).toBe(`${resource}:2`);
      view.unmount();
      await tick();
      expect(get(contextActions.active)).toBeUndefined();
    }
  );

  it("keeps a resource's real menu ahead of a newer identity fallback", async () => {
    const resolve = () => [
      { group: "all", items: [{ value: "star", label: "Star" }] }
    ];
    release = contextActions.register(BASE_CONTEXT_ZONE_PANE, {
      id: "node:1",
      resource: "node",
      resolve
    });
    render(ResourceResolver, { id: "node:1", accessMode: AccessMode.PAGE });
    await tick();
    expect(get(contextActions.active)?.resolve).toBe(resolve);
  });

  it("does not claim resource context for embedded content", async () => {
    render(ResourceResolver, { id: "task:1", accessMode: AccessMode.PANEL });
    await tick();
    expect(get(contextActions.active)).toBeUndefined();
  });

  it("does not treat an action page as a selected record", async () => {
    render(ResourceResolver, { id: "history", accessMode: AccessMode.PAGE });
    await tick();
    expect(get(contextActions.active)).toBeUndefined();
  });
});
