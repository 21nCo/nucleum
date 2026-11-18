import { describe, expect, it } from "vitest";
import { findContextActionByKey } from "./super-bar";

const action = (hotKey: string | undefined, value: string) => ({
  key: value,
  label: value,
  item: { value, hotKey }
});

describe("super bar context action keys", () => {
  const actions = [
    action("s", "star"),
    action("Backspace", "delete"),
    action(undefined, "lock")
  ];

  it("finds the action for a pressed letter, ignoring case", () => {
    expect(findContextActionByKey(actions, "s")?.label).toBe("star");
    expect(findContextActionByKey(actions, "S")?.label).toBe("star");
  });

  it("matches named keys exactly and ignores keys without an action", () => {
    expect(findContextActionByKey(actions, "Backspace")?.label).toBe("delete");
    expect(findContextActionByKey(actions, "x")).toBeUndefined();
  });
});

describe("page letters with an item open inside a space", () => {
  it("run the item's menu item and show no hints on the space", async () => {
    const { render } = await import("@testing-library/svelte");
    const { get } = await import("svelte/store");
    const { contextActions } =
      await import("@nucleum/shell/topNav/contextZone/context-actions");
    const { pageLetterTargetId } =
      await import("@nucleum/shell/shortcuts/page-keys");
    const { default: ContextActionKeys } =
      await import("./ContextActionKeys.svelte");
    const starred: string[] = [];
    const starMenu = (id: string) => () => [
      {
        group: "all",
        items: [
          {
            value: "star",
            label: "Star",
            hotKey: "s",
            callback: async () => void starred.push(id)
          }
        ]
      }
    ];
    const pane = { id: "space-pane", layer: 0 };
    const unregisterSpace = contextActions.register(pane, {
      id: "space:1",
      resource: "space",
      resolve: starMenu("space:1")
    });
    const unregisterItem = contextActions.register(pane, {
      id: "node:1",
      resource: "node",
      resolve: starMenu("node:1")
    });
    const view = render(ContextActionKeys);
    try {
      expect(get(pageLetterTargetId)).toBe("node:1");
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", cancelable: true })
      );
      await Promise.resolve();
      expect(starred).toEqual(["node:1"]);

      unregisterItem();
      expect(get(pageLetterTargetId)).toBe("space:1");
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", cancelable: true })
      );
      await Promise.resolve();
      expect(starred).toEqual(["node:1", "space:1"]);
    } finally {
      view.unmount();
      unregisterItem();
      unregisterSpace();
    }
  });
});
