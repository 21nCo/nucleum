import { describe, expect, it } from "vitest";
import { AccessMode, ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import type { IContextMenu } from "@21n/ui/elements/contextMenu/context-menu.type";
import type { INode } from "@nucleum/features/memory/node/node.type";
import { resolveNodeContextMenu } from "@nucleum/features/memory/node/node.store";
import {
  RESOURCE_ACTION_KEYS,
  resolveResourceActionKey,
  withResourceActionKeys
} from "./resource-action-keys";

describe("resource action keys", () => {
  it("maps the approved menu items to their keys", () => {
    expect(resolveResourceActionKey("star")).toBe("s");
    expect(resolveResourceActionKey("edit")).toBe("e");
    expect(resolveResourceActionKey("addToCollection")).toBe("c");
    expect(resolveResourceActionKey("open-in-full-screen")).toBe("z");
    expect(resolveResourceActionKey("open-as-split")).toBe("b");
    expect(resolveResourceActionKey("archive")).toBe("a");
    expect(resolveResourceActionKey("delete")).toBe("Backspace");
    expect(resolveResourceActionKey("copyExternalLink")).toBeUndefined();
    expect(resolveResourceActionKey(undefined)).toBeUndefined();
  });

  it("gives no key to values named like object properties", () => {
    for (const value of [
      "toString",
      "constructor",
      "hasOwnProperty",
      "__proto__"
    ])
      expect(resolveResourceActionKey(value)).toBeUndefined();
    const keyed = withResourceActionKeys([
      { group: "g", items: [{ value: "toString" }, { value: "star" }] }
    ] as any);
    expect(keyed[0].items.map((item) => item.hotKey)).toEqual([undefined, "s"]);
  });

  it("adds hints without changing the original menu", () => {
    const menu = [
      { group: "g", items: [{ value: "star" }, { value: "lock" }] }
    ] as any;
    const keyed = withResourceActionKeys(menu);
    expect(keyed[0].items[0].hotKey).toBe("s");
    expect(keyed[0].items[1].hotKey).toBeUndefined();
    expect(menu[0].items[0].hotKey).toBeUndefined();
  });
});

describe("letters on an open note's menu", () => {
  const note = (contentType: NodeType) =>
    ({
      id: `node:${contentType.toLowerCase()}-letters`,
      label: "Letters",
      contentType,
      isStarred: false
    }) as unknown as INode;

  /** Keys an open note's menu offers, as its "..." menu and super bar show them. */
  function offeredKeys(menu: IContextMenu) {
    return new Set(
      withResourceActionKeys(menu).flatMap((group) =>
        group.items.flatMap((item) => (item.hotKey ? [item.hotKey] : []))
      )
    );
  }

  const pageNote = () =>
    offeredKeys(
      resolveNodeContextMenu(
        note(NodeType.NODULAR_MARKDOWN),
        ResourceAccessPoint.SELF,
        { accessMode: AccessMode.PAGE }
      )
    );

  it("offers focus mode with its F letter on an open note", () => {
    const menu = withResourceActionKeys(
      resolveNodeContextMenu(
        note(NodeType.NODULAR_MARKDOWN),
        ResourceAccessPoint.SELF,
        { accessMode: AccessMode.PAGE }
      )
    );
    const focus = menu
      .flatMap((group) => group.items)
      .find((item) => item.hotKey === "f");
    expect(focus?.label).toBe("Focus");
  });

  it("reaches a real menu item for every letter but U on open notes", () => {
    const offered = new Set([
      ...pageNote(),
      ...offeredKeys(
        resolveNodeContextMenu(
          note(NodeType.NODULAR_MARKDOWN),
          ResourceAccessPoint.SELF,
          { accessMode: AccessMode.BESIDE_BASE }
        )
      ),
      ...offeredKeys(
        resolveNodeContextMenu(note(NodeType.IMAGE), ResourceAccessPoint.SELF, {
          accessMode: AccessMode.PAGE
        })
      )
    ]);
    const mapped = new Set(Object.values(RESOURCE_ACTION_KEYS));
    mapped.delete("u");
    expect([...mapped].filter((key) => !offered.has(key))).toEqual([]);
  });
});
