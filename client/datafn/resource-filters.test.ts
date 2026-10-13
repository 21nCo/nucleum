import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activeResourceFilter,
  activeResourceFilterIgnoreAncestorInactive,
  activeResourceFilterV2,
  archivedResourceFilter,
  nonTrashFilter
} from "@nucleum/datafn/resource-filters";

describe("client/datafn/resource-filters", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("filters active and archived resources", () => {
    const base = {
      isArchived: false,
      trashedAt: null,
      isAncestorInactive: false
    };
    expect(activeResourceFilter({ ...base })).toBe(true);
    expect(activeResourceFilter({ ...base, isArchived: true })).toBe(false);
    expect(activeResourceFilter({ ...base, trashedAt: 123 })).toBe(false);

    expect(activeResourceFilterIgnoreAncestorInactive({ ...base })).toBe(true);
    expect(
      activeResourceFilterIgnoreAncestorInactive({ ...base, isArchived: true })
    ).toBe(false);
    expect(
      activeResourceFilterIgnoreAncestorInactive({ ...base, trashedAt: 123 })
    ).toBe(false);

    expect(activeResourceFilterV2).toEqual({
      isArchived: false,
      trashedAt: { $is_null: true },
      isAncestorInactive: false
    });

    expect(archivedResourceFilter({ ...base, isArchived: true })).toBe(true);
    expect(
      archivedResourceFilter({ ...base, isArchived: true, trashedAt: 123 })
    ).toBe(false);
    expect(nonTrashFilter({ trashedAt: null })).toBe(true);
    expect(nonTrashFilter({ trashedAt: 123 })).toBe(false);
  });
});
