import { describe, expect, it } from "vitest";
import { describePageKey, findContextActionByKey } from "./super-bar";

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

describe("super bar context action key hints", () => {
  it("match a pressed letter in either case, whatever the hint's case", () => {
    const upper = [action("S", "star"), action("Backspace", "delete")];
    expect(findContextActionByKey(upper, "s")?.label).toBe("star");
    expect(findContextActionByKey(upper, "S")?.label).toBe("star");
  });

  it("match a named key only exactly", () => {
    const actions = [action("Backspace", "delete")];
    expect(findContextActionByKey(actions, "Backspace")?.label).toBe("delete");
    expect(findContextActionByKey(actions, "backspace")).toBeUndefined();
    expect(findContextActionByKey(actions, "BACKSPACE")).toBeUndefined();
  });

  it("name the page key a row's hint stands for", () => {
    expect(describePageKey("s")).toBe("Press S on the page");
    expect(describePageKey("Backspace")).toBe("Press Backspace on the page");
  });
});

describe("page letters with an item open inside a space", () => {
  it("run the item's menu item, which is the target the space menu checks", async () => {
    const { render } = await import("@testing-library/svelte");
    const { get } = await import("svelte/store");
    const { contextActions } =
      await import("@nucleum/shell/topNav/contextZone/context-actions");
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
    let view: ReturnType<typeof render> | undefined;
    try {
      view = render(ContextActionKeys);
      expect(get(contextActions.active)?.id).toBe("node:1");
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", cancelable: true })
      );
      await Promise.resolve();
      expect(starred).toEqual(["node:1"]);

      unregisterItem();
      expect(get(contextActions.active)?.id).toBe("space:1");
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", cancelable: true })
      );
      await Promise.resolve();
      expect(starred).toEqual(["node:1", "space:1"]);
    } finally {
      try {
        view?.unmount();
      } finally {
        unregisterItem();
        unregisterSpace();
      }
    }
  });
});
