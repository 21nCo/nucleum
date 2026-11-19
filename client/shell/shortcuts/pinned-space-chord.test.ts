import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pinned: [] as string[],
  spaces: [] as { id: string }[],
  query: vi.fn()
}));

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { space: { query: mocks.query } }
}));
vi.mock("@nucleum/shell/navigation/app-menu.store", () => ({
  appMenuStore: {
    read: async () => ({}),
    pinnedSpaces: () => mocks.pinned
  }
}));

import { resolvePinnedSpaceAt } from "./pinned-space-chord";

describe("resolvePinnedSpaceAt", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.query.mockImplementation(async () => ({ data: mocks.spaces }));
  });

  it("counts positions in the shown order, skipping pins whose space is missing", async () => {
    mocks.pinned = ["space-a", "space-gone", "space-b"];
    mocks.spaces = [{ id: "space-b" }, { id: "space-a" }];

    expect((await resolvePinnedSpaceAt(0))?.id).toBe("space-a");
    expect((await resolvePinnedSpaceAt(1))?.id).toBe("space-b");
    expect(await resolvePinnedSpaceAt(2)).toBeUndefined();
  });

  it("returns nothing past the pinned spaces without reading spaces", async () => {
    mocks.pinned = ["space-a"];

    expect(await resolvePinnedSpaceAt(4)).toBeUndefined();
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
