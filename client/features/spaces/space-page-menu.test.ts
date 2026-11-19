import { describe, expect, it, vi } from "vitest";

const calls: string[] = [];

vi.mock("@nucleum/features/records/resource.actions", () => ({
  ResourceActions: class {
    star() {
      return { value: "star", callback: async () => void calls.push("star") };
    }
    archive() {
      return {
        value: "archive",
        callback: async () => void calls.push("archive")
      };
    }
    trash() {
      return {
        value: "delete",
        callback: async () => void calls.push("trash")
      };
    }
  }
}));

const { isSpaceLoaded, resolveKeyedSpacePageMenu, resolveSpacePageMenu } =
  await import("./space-page-menu");

describe("space page menu", () => {
  it("reloads the space after star, archive and trash", async () => {
    const onChanged = vi.fn(async () => void calls.push("reload"));
    const menu = resolveSpacePageMenu({ id: "space:1" } as any, {
      isPinned: false,
      onRename: vi.fn(),
      onTogglePin: vi.fn(),
      onChanged
    });
    const items = menu.flatMap((group) => group.items);
    for (const value of ["star", "archive", "delete"]) {
      await items.find((item) => item.value === value)?.callback?.();
    }
    expect(calls).toEqual([
      "star",
      "reload",
      "archive",
      "reload",
      "trash",
      "reload"
    ]);
  });

  it("does not reload after rename or pin", async () => {
    const onChanged = vi.fn();
    const onRename = vi.fn();
    const onTogglePin = vi.fn();
    const menu = resolveSpacePageMenu({ id: "space:1" } as any, {
      isPinned: true,
      onRename,
      onTogglePin,
      onChanged
    });
    await menu[0].items.find((item) => item.value === "rename")?.callback?.();
    expect(onRename).toHaveBeenCalled();
    await menu[0].items.find((item) => item.value === "pin")?.callback?.();
    expect(onTogglePin).toHaveBeenCalledTimes(1);
    expect(onChanged).not.toHaveBeenCalled();
    expect(menu[0].items.find((item) => item.value === "pin")?.label).toBe(
      "Unpin from app menu"
    );
  });

  it("sets the single-key letters as hints only while keyed", () => {
    const params = {
      isPinned: false,
      onRename: vi.fn(),
      onTogglePin: vi.fn(),
      onChanged: vi.fn()
    };
    const hints = (isKeyed: boolean) =>
      resolveKeyedSpacePageMenu({ id: "space:1" } as any, {
        ...params,
        isKeyed
      })
        .flatMap((group) => group.items)
        .map((item) => [item.value, item.hotKey]);
    expect(hints(true)).toEqual([
      ["rename", undefined],
      ["pin", undefined],
      ["star", "s"],
      ["archive", "a"],
      ["delete", "Backspace"]
    ]);
    expect(hints(false)).toEqual([
      ["rename", undefined],
      ["pin", undefined],
      ["star", undefined],
      ["archive", undefined],
      ["delete", undefined]
    ]);
  });

  it.each([
    ["a first load that failed", { isLoadFailed: true }],
    ["a missing record", { isMissing: true }],
    [
      "a snapshot kept after a failed reload",
      { id: "space:1", label: "Space", isLoadFailed: true }
    ],
    ["a nested space whose root did not load", { view: "sidenav" }]
  ])("offers no star, archive or trash for %s", (_name, space) => {
    expect(isSpaceLoaded(space as any)).toBe(false);
    const menu = resolveSpacePageMenu(space as any, {
      isPinned: false,
      onRename: vi.fn(),
      onTogglePin: vi.fn(),
      onChanged: vi.fn()
    });
    expect(
      menu.flatMap((group) => group.items).map((item) => item.value)
    ).toEqual(["rename", "pin"]);
  });

  it("treats a space with an id and no load failure as loaded", () => {
    expect(isSpaceLoaded({ id: "space:1" } as any)).toBe(true);
    expect(isSpaceLoaded(undefined)).toBe(false);
  });
});
