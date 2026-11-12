// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { focusTrap } from "./focus-trap.action";

function setup() {
  document.body.innerHTML = `
    <button id="opener">Open</button>
    <div id="sheet" tabindex="-1">
      <button id="first">Close</button>
      <input id="last" />
    </div>
  `;
  const opener = document.getElementById("opener") as HTMLElement;
  opener.focus();
  const sheet = document.getElementById("sheet") as HTMLElement;
  return { opener, sheet, trap: focusTrap(sheet) };
}

function tab(target: HTMLElement, shiftKey = false) {
  const event = new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey,
    bubbles: true,
    cancelable: true
  });
  target.dispatchEvent(event);
  return event;
}

describe("client/ui/actions/focus-trap.action", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("moves focus into the trapped element when it opens", () => {
    const { sheet } = setup();
    expect(document.activeElement).toBe(sheet);
  });

  it("wraps Shift+Tab from the first control to the last", () => {
    setup();
    const first = document.getElementById("first") as HTMLElement;
    first.focus();
    const event = tab(first, true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("last");
  });

  it("wraps Tab from the last control to the first", () => {
    setup();
    const last = document.getElementById("last") as HTMLElement;
    last.focus();
    const event = tab(last);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("first");
  });

  it("returns focus to the opener when it is removed", async () => {
    const { opener, trap } = setup();
    trap.destroy();
    await Promise.resolve();
    expect(document.activeElement).toBe(opener);
  });

  it("leaves a Tab that a control inside already handled alone", () => {
    setup();
    const last = document.getElementById("last") as HTMLElement;
    last.focus();
    last.addEventListener("keydown", (event) => event.preventDefault());
    tab(last);
    expect(document.activeElement).toBe(last);
  });

  it("returns focus to an opener that stops being inert after the trap is removed", async () => {
    document.body.innerHTML = `
      <div id="covered"><button id="opener">Open</button></div>
      <div id="sheet" tabindex="-1"><button id="close">Close</button></div>
    `;
    const opener = document.getElementById("opener") as HTMLElement;
    const covered = document.getElementById("covered") as HTMLElement;
    const sheet = document.getElementById("sheet") as HTMLElement;
    const focus = HTMLElement.prototype.focus;
    opener.focus = function (this: HTMLElement) {
      if (!this.closest("[inert]")) focus.call(this);
    };
    opener.focus();
    covered.setAttribute("inert", "");
    const trap = focusTrap(sheet);
    (document.getElementById("close") as HTMLElement).focus();
    sheet.remove();
    trap.destroy();
    covered.removeAttribute("inert");
    await Promise.resolve();
    expect(document.activeElement).toBe(opener);
  });

  it("keeps focus that moved elsewhere after the trap is removed", async () => {
    const { trap } = setup();
    const other = document.createElement("button");
    document.body.append(other);
    trap.destroy();
    other.focus();
    await Promise.resolve();
    expect(document.activeElement).toBe(other);
  });

  it("wraps from the last control that Tab can reach", () => {
    document.body.innerHTML = `
      <div id="sheet" tabindex="-1">
        <button id="first">Close</button>
        <button id="reachable">Movies</button>
        <button id="skipped" tabindex="-1">Articles</button>
      </div>
    `;
    const sheet = document.getElementById("sheet") as HTMLElement;
    focusTrap(sheet);
    const reachable = document.getElementById("reachable") as HTMLElement;
    reachable.focus();
    const event = tab(reachable);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("first");
  });

  it("keeps focus inside and stops wrapping when it is released", async () => {
    const { trap } = setup();
    const last = document.getElementById("last") as HTMLElement;
    last.focus();
    trap.release();
    await Promise.resolve();
    expect(document.activeElement).toBe(last);
    expect(tab(last).defaultPrevented).toBe(false);
  });

  it("returns focus to a given opener instead of the focused element", async () => {
    const { opener, sheet, trap } = setup();
    trap.release();
    const last = document.getElementById("last") as HTMLElement;
    last.focus();
    const again = focusTrap(sheet, { opener: trap.opener });
    expect(again.opener).toBe(opener);
    again.destroy();
    sheet.remove();
    await Promise.resolve();
    expect(document.activeElement).toBe(opener);
  });

  it("cycles Tab through included containers after the trapped element", () => {
    document.body.innerHTML = `
      <div id="sheet" tabindex="-1">
        <button id="first">Close</button>
        <button id="last">Font</button>
      </div>
      <div id="popovers"><button id="option">Option</button></div>
    `;
    const sheet = document.getElementById("sheet") as HTMLElement;
    const popovers = document.getElementById("popovers") as HTMLElement;
    const first = document.getElementById("first") as HTMLElement;
    const last = document.getElementById("last") as HTMLElement;
    const option = document.getElementById("option") as HTMLElement;
    const trap = focusTrap(sheet, { include: [popovers] });

    first.focus();
    expect(tab(first).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
    tab(last);
    expect(document.activeElement).toBe(option);
    tab(option);
    expect(document.activeElement).toBe(first);
    tab(first, true);
    expect(document.activeElement).toBe(option);

    trap.release();
    expect(tab(option).defaultPrevented).toBe(false);
  });
});
