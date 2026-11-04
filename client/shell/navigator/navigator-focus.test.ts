import { get } from "svelte/store";
import { describe, expect, it } from "vitest";
import {
  navigatorFocusRequests,
  requestNavigatorFocus
} from "@nucleum/shell/navigator/navigator-focus";

describe("navigator focus requests", () => {
  it("counts each request so an open navigator can refocus its search", () => {
    const before = get(navigatorFocusRequests);
    requestNavigatorFocus();
    requestNavigatorFocus();
    expect(get(navigatorFocusRequests)).toBe(before + 2);
  });
});
