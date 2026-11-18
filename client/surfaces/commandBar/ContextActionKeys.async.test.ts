import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BASE_CONTEXT_ZONE_PANE,
  ContextZoneLayer,
  contextZone,
  type ContextZonePane
} from "@nucleum/shell/topNav/contextZone/context-zone";

const mocks = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: mocks.error, warn: vi.fn() }
}));

import { get } from "svelte/store";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
import { confirmationNotification } from "@nucleum/shared-state/notifications/notification.store";
import { registerEditModeFinisher } from "@nucleum/shared-state/resources/edit-mode-finish";
import ContextActionKeys from "./ContextActionKeys.svelte";

const SPLIT_PANE: ContextZonePane = {
  id: "beside-base",
  layer: ContextZoneLayer.BESIDE_BASE
};

async function settle() {
  for (let index = 0; index < 5; index++) await tick();
}

async function press(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true }));
  await settle();
}

function menu(value: string, hotKey: string, callback: () => Promise<void>) {
  return () => [
    { group: "all", items: [{ value, label: value, hotKey, callback }] }
  ];
}

describe("page letters with failing or delayed actions", () => {
  let release: (() => void)[] = [];

  beforeEach(() => {
    mocks.error.mockClear();
    release.push(contextZone.host());
    release.push(contextZone.registerPane(BASE_CONTEXT_ZONE_PANE));
    release.push(contextZone.registerPane(SPLIT_PANE));
    const keys = render(ContextActionKeys);
    release.push(() => keys.unmount());
  });

  afterEach(() => {
    release.reverse().forEach((unregister) => unregister());
    release = [];
    contextZone.releasePane(SPLIT_PANE.id);
    contextZone.releasePane(BASE_CONTEXT_ZONE_PANE.id);
  });

  it("logs a failed action and runs it again on the next press", async () => {
    let calls = 0;
    release.push(
      contextActions.register(BASE_CONTEXT_ZONE_PANE, {
        id: "node:1",
        resource: "node",
        resolve: menu("star", "s", async () => {
          calls++;
          if (calls === 1) throw new Error("star failed");
        })
      })
    );
    contextZone.activatePane(BASE_CONTEXT_ZONE_PANE.id);

    await press("s");
    expect(calls).toBe(1);
    expect(mocks.error).toHaveBeenCalledWith(
      expect.objectContaining({ at: "ContextActionKeys", action: "star" })
    );

    await press("s");
    expect(calls).toBe(2);
    expect(mocks.error).toHaveBeenCalledTimes(1);
  });

  it("logs a failed save before edit mode", async () => {
    const edits: string[] = [];
    release.push(
      contextActions.register(BASE_CONTEXT_ZONE_PANE, {
        id: "node:1",
        resource: "node",
        resolve: menu("edit", "e", async () => void edits.push("node:1"))
      }),
      registerEditModeFinisher("node:1", async () => {
        throw new Error("save failed");
      })
    );
    contextZone.activatePane(BASE_CONTEXT_ZONE_PANE.id);

    await press("e");
    expect(edits).toEqual([]);
    expect(mocks.error).toHaveBeenCalledWith(
      expect.objectContaining({ at: "ContextActionKeys", action: "edit" })
    );
  });

  it("runs edit after the save only while the resource still takes the letters", async () => {
    const edits: string[] = [];
    let finishSave: (saved: boolean) => void = () => undefined;
    release.push(
      contextActions.register(BASE_CONTEXT_ZONE_PANE, {
        id: "node:1",
        resource: "node",
        resolve: menu("edit", "e", async () => void edits.push("node:1"))
      }),
      contextActions.register(SPLIT_PANE, {
        id: "node:2",
        resource: "node",
        resolve: menu("edit", "e", async () => void edits.push("node:2"))
      }),
      registerEditModeFinisher(
        "node:1",
        () => new Promise<boolean>((resolve) => (finishSave = resolve))
      )
    );
    contextZone.activatePane(BASE_CONTEXT_ZONE_PANE.id);

    await press("e");
    contextZone.activatePane(SPLIT_PANE.id);
    finishSave(true);
    await settle();
    expect(edits).toEqual([]);

    contextZone.activatePane(BASE_CONTEXT_ZONE_PANE.id);
    await press("e");
    finishSave(true);
    await settle();
    expect(edits).toEqual(["node:1"]);
  });

  it("keeps the trash confirmation open when trash fails, and closes it after a retry", async () => {
    let calls = 0;
    release.push(
      contextActions.register(BASE_CONTEXT_ZONE_PANE, {
        id: "node:1",
        resource: "node",
        resolve: menu("delete", "Backspace", async () => {
          calls++;
          if (calls === 1) throw new Error("trash failed");
        })
      })
    );
    contextZone.activatePane(BASE_CONTEXT_ZONE_PANE.id);

    await press("Backspace");
    const confirm = get(confirmationNotification)?.confirmAction?.callback;
    expect(calls).toBe(0);

    await expect(confirm?.()).resolves.toBe(false);
    expect(mocks.error).toHaveBeenCalledWith(
      expect.objectContaining({ at: "ContextActionKeys", action: "delete" })
    );
    await expect(confirm?.()).resolves.toBe(true);
    expect(calls).toBe(2);
    confirmationNotification.set(undefined);
  });
});
