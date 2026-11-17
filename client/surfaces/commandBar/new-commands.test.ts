import { describe, expect, it } from "vitest";
import { Resource } from "@nucleum/datafn/resource.enum";
import { resolveNewCommands } from "./new-commands";

const actions: Record<string, { label: string }> = {
  [`${Resource.collection}_create`]: { label: "Create a new collection" },
  [`${Resource.event}_create`]: { label: "Create a new event" }
};
const resolveAction = (slug: string) =>
  (actions[slug] ? { action: slug, ...actions[slug] } : null) as any;

describe("new commands", () => {
  it("lists the registered create commands", () => {
    expect(resolveNewCommands("", resolveAction).map((x) => x.label)).toEqual(
      expect.arrayContaining(["Create a new collection", "Create a new event"])
    );
    expect(resolveNewCommands("", resolveAction)).toHaveLength(2);
  });

  it("filters by label, ignoring case", () => {
    expect(resolveNewCommands("EVENT", resolveAction)).toEqual([
      {
        id: `${Resource.event}_create`,
        label: "Create a new event",
        icon: undefined
      }
    ]);
  });
});
