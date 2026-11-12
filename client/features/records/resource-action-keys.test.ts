import { describe, expect, it } from "vitest";
import {
  resolveResourceActionKey,
  withResourceActionKeys
} from "./resource-action-keys";

describe("resource action keys", () => {
  it("maps the approved menu items to their keys", () => {
    expect(resolveResourceActionKey("star")).toBe("s");
    expect(resolveResourceActionKey("edit")).toBe("e");
    expect(resolveResourceActionKey("addToCollection")).toBe("c");
    expect(resolveResourceActionKey("open-in-full-screen")).toBe("z");
    expect(resolveResourceActionKey("open-as-split")).toBe("b");
    expect(resolveResourceActionKey("archive")).toBe("a");
    expect(resolveResourceActionKey("delete")).toBe("Backspace");
    expect(resolveResourceActionKey("copyExternalLink")).toBeUndefined();
    expect(resolveResourceActionKey(undefined)).toBeUndefined();
  });

  it("adds hints without changing the original menu", () => {
    const menu = [
      { group: "g", items: [{ value: "star" }, { value: "lock" }] }
    ] as any;
    const keyed = withResourceActionKeys(menu);
    expect(keyed[0].items[0].hotKey).toBe("s");
    expect(keyed[0].items[1].hotKey).toBeUndefined();
    expect(menu[0].items[0].hotKey).toBeUndefined();
  });
});
