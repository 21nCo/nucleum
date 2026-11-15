import { render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import SpaceResourceRenderer from "@nucleum/features/spaces/SpaceResourceRenderer.svelte";
import { Resource } from "@nucleum/datafn/resource.enum";

const mocks = vi.hoisted(() => ({
  isInPlace: undefined as boolean | undefined,
  close: undefined as (() => void) | undefined
}));

vi.mock("@21n/ui/actions/resize.action", () => ({
  resizeListener: () => ({ destroy: () => undefined })
}));
vi.mock("@nucleum/features/memory/node/Node.svelte", async () => {
  const resources =
    await import("@nucleum/shared-state/resources/in-place-resource");
  return {
    default: () => {
      mocks.isInPlace = resources.isInPlaceResource();
      mocks.close = resources.resolveInPlaceResourceClose();
    }
  };
});
vi.mock("@nucleum/features/collections/Collection.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/focus/goals/Goal.svelte", () => ({
  default: () => {}
}));

afterEach(() => {
  mocks.isInPlace = undefined;
  mocks.close = undefined;
});

describe("closing an item shown in a space", () => {
  it("offers no close handler when the host provides none", () => {
    render(SpaceResourceRenderer, {
      props: { resourceId: "node:a", resourceType: Resource.node }
    });
    expect(mocks.isInPlace).toBe(true);
    expect(mocks.close).toBeUndefined();
  });

  it("closes through the host's handler when it provides one", () => {
    const onClose = vi.fn();
    render(SpaceResourceRenderer, {
      props: { resourceId: "node:a", resourceType: Resource.node, onClose }
    });
    expect(mocks.close).toBeTypeOf("function");
    mocks.close?.();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
