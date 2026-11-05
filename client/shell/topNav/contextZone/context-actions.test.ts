import { afterEach, describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";

const cleanups: (() => void)[] = [];

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  contextZone.setVisibleLayers(undefined);
});

describe("contextActions.active", () => {
  it("ignores actions of a layer covered by a page", () => {
    cleanups.push(
      contextActions.register(
        { id: "beside", layer: 1 },
        { id: "node:a", resource: "node", resolve: () => [] }
      )
    );
    expect(get(contextActions.active)?.id).toBe("node:a");
    contextZone.setVisibleLayers([2, 3]);
    expect(get(contextActions.active)).toBeUndefined();
  });
});
