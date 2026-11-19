import { fireEvent, render, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContextMenu from "@21n/ui/elements/contextMenu/ContextMenu.svelte";
import ContextMenuAction from "@21n/ui/elements/contextMenu/ContextMenuAction.svelte";
import type { IContextMenuGroup } from "@21n/ui/elements/contextMenu/context-menu.type";

vi.mock("@21n/ui/elements/markdown/markdown.utils", () => ({
  renderMdAsHtml: (value: string) => value
}));

const recordMenu = (): IContextMenuGroup[] => [
  {
    group: "record",
    items: [
      { value: "star", label: "Star" },
      { value: "archive", label: "Archive" }
    ]
  }
];

const menu = (): IContextMenuGroup[] => [
  {
    group: "main",
    items: [
      {
        value: "actions",
        label: "Actions",
        secondStepComponent: {
          isFocusedOnKeyboardOpen: true,
          component: ContextMenu,
          props: { menuResolver: recordMenu, heading: "Actions" }
        }
      }
    ]
  }
];

/** The document, or a shadow root that holds the menu's popover containers. */
type Scope = { root: Document | ShadowRoot; target?: HTMLElement };

function documentScope(): Scope {
  for (const id of ["popovers", "secondary-popovers"]) {
    const container = document.createElement("div");
    container.id = id;
    document.body.append(container);
  }
  return { root: document };
}

function shadowScope(): Scope {
  const host = document.createElement("div");
  document.body.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const target = document.createElement("div");
  shadow.append(target);
  for (const id of ["popovers", "secondary-popovers"]) {
    const container = document.createElement("div");
    container.id = id;
    shadow.append(container);
  }
  return { root: shadow, target };
}

/** The deepest focused element, followed through open shadow roots. */
function deepActive(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement)
    active = active.shadowRoot.activeElement;
  return active;
}

describe("context menu submenu keyboard hand-off", () => {
  beforeEach(() => {
    // jsdom has no layout, so a shown layer reports no boxes and takes no keys.
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
      {}
    ] as unknown as DOMRectList);
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    );
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Opens the menu and returns its Actions row and the root it renders in. */
  async function openMenu(makeScope: () => Scope) {
    const { root, target } = makeScope();
    const { component } = render(ContextMenuAction, {
      ...(target ? { target } : {}),
      props: { id: "handoffTest", menuResolver: menu }
    });
    expect(component.show()).toBe(true);
    const row = await waitFor(() => {
      const element = root.querySelector<HTMLElement>(
        '#popovers [data-context-menu-item-id="actions"]'
      );
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    row.focus();
    expect(deepActive()).toBe(row);
    return { root, row };
  }

  async function awaitSubmenuItem(root: Document | ShadowRoot) {
    return waitFor(() => {
      const element = root.querySelector<HTMLElement>(
        '#secondary-popovers [data-context-menu-item-id="star"]'
      );
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
  }

  async function expectEscapeReturnsToRow(
    root: Document | ShadowRoot,
    row: HTMLElement,
    first: HTMLElement
  ) {
    await fireEvent.keyDown(first, { key: "Escape" });
    await waitFor(() =>
      expect(root.querySelector("#secondary-popovers .popover")).toBeNull()
    );
    await waitFor(() => expect(deepActive()).toBe(row));
  }

  it("opens a closed submenu from the keyboard with focus in it, and returns to the row", async () => {
    const { root, row } = await openMenu(documentScope);

    await fireEvent.keyDown(row, { key: "ArrowRight" });
    const first = await awaitSubmenuItem(root);
    await waitFor(() => expect(deepActive()).toBe(first));

    await expectEscapeReturnsToRow(root, row, first);
  });

  it.each([
    ["the document", documentScope],
    ["a shadow root", shadowScope]
  ])("moves focus into a submenu that hover shows, in %s, and returns to the row", async (_name, makeScope) => {
    const { root, row } = await openMenu(makeScope);

    await fireEvent.mouseEnter(row);
    const first = await awaitSubmenuItem(root);
    expect(deepActive()).toBe(row);

    await fireEvent.keyDown(row, { key: "ArrowRight" });
    await waitFor(() => expect(deepActive()).toBe(first));

    await expectEscapeReturnsToRow(root, row, first);
  });
});
