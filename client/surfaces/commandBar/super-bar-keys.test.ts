import { describe, expect, it } from "vitest";
import { findContextActionByKey } from "./super-bar";

const action = (hotKey: string | undefined, value: string) => ({
  key: value,
  label: value,
  item: { value, hotKey }
});

describe("super bar context action keys", () => {
  const actions = [
    action("s", "star"),
    action("Backspace", "delete"),
    action(undefined, "lock")
  ];

  it("finds the action for a pressed letter, ignoring case", () => {
    expect(findContextActionByKey(actions, "s")?.label).toBe("star");
    expect(findContextActionByKey(actions, "S")?.label).toBe("star");
  });

  it("matches named keys exactly and ignores keys without an action", () => {
    expect(findContextActionByKey(actions, "Backspace")?.label).toBe("delete");
    expect(findContextActionByKey(actions, "x")).toBeUndefined();
  });
});
