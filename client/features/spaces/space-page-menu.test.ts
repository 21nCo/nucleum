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

const { resolveSpacePageMenu } = await import("./space-page-menu");

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
    const menu = resolveSpacePageMenu({ id: "space:1" } as any, {
      isPinned: true,
      onRename,
      onTogglePin: vi.fn(),
      onChanged
    });
    await menu[0].items.find((item) => item.value === "rename")?.callback?.();
    expect(onRename).toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
    expect(menu[0].items.find((item) => item.value === "pin")?.label).toBe(
      "Unpin from app menu"
    );
  });
});
