import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  POPOVER_KEEP_OPEN_ATTRIBUTE,
  PopoverTriggerMethod
} from "@21n/ui/actions/popover.type";
import { popover } from "@21n/ui/actions/popover.action";

vi.mock("@21n/ui/elements/markdown/markdown.utils", () => ({
  renderMdAsHtml: (value: string) => value
}));

async function openPopover() {
  const trigger = document.createElement("button");
  document.body.append(trigger);
  const action = popover(trigger, {
    id: "keep-open-popover",
    content: "menu",
    triggerMethod: [PopoverTriggerMethod.CLICK]
  });
  const opened = new Promise<void>((resolve) =>
    trigger.addEventListener("change", (event) => {
      if ((event as CustomEvent<{ open: boolean }>).detail.open) resolve();
    })
  );
  trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await opened;
  expect(document.querySelector("#popovers .popover")).toBeTruthy();
  return action;
}

describe("popover outside clicks", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="popovers"></div><div id="secondary-popovers"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("stays open on a click inside content marked to keep it open", async () => {
    const action = await openPopover();
    const submenu = document.createElement("div");
    submenu.setAttribute(POPOVER_KEEP_OPEN_ATTRIBUTE, "");
    const option = document.createElement("button");
    submenu.append(option);
    document.getElementById("secondary-popovers")!.append(submenu);

    option.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.querySelector("#popovers .popover")).toBeTruthy();
    action.destroy();
  });

  it("still closes on a click in unmarked secondary content", async () => {
    const action = await openPopover();
    const content = document.createElement("button");
    document.getElementById("secondary-popovers")!.append(content);

    content.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.querySelector("#popovers .popover")).toBeNull();
    action.destroy();
  });
});
