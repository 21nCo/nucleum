// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import { ResourceActions } from "@nucleum/features/records/resource.actions";

describe("ResourceActions.selectIfSupported", () => {
  const resource = {
    id: "node:select-support",
    createdAt: 0,
    updatedAt: 0
  };

  it("offers Select where bulk selection has toolbar actions", () => {
    const actions = new ResourceActions(resource, {
      accessPoint: ResourceAccessPoint.LIBRARY
    });
    expect(
      actions
        .selectIfSupported(ResourceAccessPoint.LIBRARY)
        .map((item) => item.label)
    ).toEqual(["Select"]);
  });

  it("omits Select for cards shown inside a space", () => {
    const actions = new ResourceActions(resource, {
      accessPoint: ResourceAccessPoint.SPACE
    });
    expect(
      actions.selectIfSupported(ResourceAccessPoint.SPACE, "space:wall")
    ).toEqual([]);
  });
});
