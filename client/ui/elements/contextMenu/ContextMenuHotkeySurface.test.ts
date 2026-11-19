import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ContextMenu from "@21n/ui/elements/contextMenu/ContextMenu.svelte";

vi.mock("@21n/ui/actions/popover.action", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  popover: () => ({ update: () => undefined, destroy: () => undefined }),
  tooltip: () => ({ update: () => undefined, destroy: () => undefined })
}));

const menu = () => [
  {
    group: "modes",
    isToggleGroup: true,
    items: [{ value: "star", label: "Star", hotKey: "s" }]
  },
  {
    group: "all",
    items: [
      { value: "archive", label: "Archive", hotKey: "a" },
      {
        value: "addToCollection",
        label: "Add to collection",
        hotKey: "c",
        secondStepComponent: { component: () => {} }
      }
    ]
  }
];

/** Background class of the key hint rendered on a menu item. */
function hintBackground(container: HTMLElement, value: string) {
  const hint = container.querySelector(
    `[data-context-menu-item-id='${value}'] [data-testid='context-menu-item-hotkey'] span`
  );
  expect(hint, `hint of ${value}`).not.toBeNull();
  return [...(hint as HTMLElement).classList].filter((name) =>
    name.startsWith("bg-bgs")
  );
}

describe("context menu key hints", () => {
  it.each([
    ["a top level menu", 1, "bg-bgs3"],
    ["a menu nested one surface up", 2, "bg-bgs4"]
  ])(
    "sit on the menu surface's background in %s",
    (_name, parentBgIndex, expected) => {
      const { container } = render(ContextMenu, {
        props: { menuResolver: menu as never, parentBgIndex }
      });
      expect(hintBackground(container, "star")).toEqual([expected]);
      expect(hintBackground(container, "archive")).toEqual([expected]);
      expect(hintBackground(container, "addToCollection")).toEqual([expected]);
    }
  );
});
