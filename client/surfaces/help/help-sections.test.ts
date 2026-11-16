import { describe, expect, it } from "vitest";
import { resolveHelpSections } from "./help-sections";

const remoteConfig = [
  { section: "main", children: ["docs", "shortcuts"] },
  { section: "Community", children: ["discord"] }
];

describe("resolveHelpSections", () => {
  it.each([
    ["absent", undefined],
    ["null", null],
    ["empty", []],
    ["not an array", { section: "main" }]
  ])("shows Troubleshoot when the remote config is %s", (_label, config) => {
    expect(resolveHelpSections(config as never, false)).toEqual([
      { heading: undefined, items: ["troubleshoot"] }
    ]);
  });

  it("shows Troubleshoot first in the first section of a remote config", () => {
    expect(resolveHelpSections(remoteConfig, false)).toEqual([
      { heading: undefined, items: ["troubleshoot", "docs", "shortcuts"] },
      { heading: "Community", items: ["discord"] }
    ]);
  });

  it("keeps Troubleshoot first when the first remote section is inactive", () => {
    const config = [
      { section: "main", isInactive: true, children: ["docs"] },
      { section: "Community", children: ["discord"] }
    ];
    expect(resolveHelpSections(config, false)).toEqual([
      { heading: "Community", items: ["troubleshoot", "discord"] }
    ]);
  });

  it("shows Troubleshoot when every remote section is inactive", () => {
    const config = [{ section: "main", isInactive: true, children: ["docs"] }];
    expect(resolveHelpSections(config, true)).toEqual([
      { heading: undefined, items: ["troubleshoot", "chat"] }
    ]);
  });

  it("puts Troubleshoot before Chat for subscribers", () => {
    expect(resolveHelpSections(remoteConfig, true)[0].items).toEqual([
      "troubleshoot",
      "chat",
      "docs",
      "shortcuts"
    ]);
  });

  it("shows Troubleshoot once when the remote config also lists it", () => {
    const config = [
      { section: "main", children: ["docs", "troubleshoot"] },
      { section: "More", children: ["troubleshoot", "chat"] }
    ];
    const sections = resolveHelpSections(config, true);
    const items = sections.flatMap((section) => section.items);
    expect(items.filter((item) => item === "troubleshoot")).toHaveLength(1);
    expect(items.filter((item) => item === "chat")).toHaveLength(1);
    expect(items[0]).toBe("troubleshoot");
  });

  it.each([
    [
      "subscribers",
      true,
      ["troubleshoot", "chat"],
      ["troubleshoot", "chat", "docs"]
    ],
    ["non-subscribers", false, ["troubleshoot"], ["troubleshoot", "docs"]]
  ])(
    "drops a later section holding only code-owned tiles for %s",
    (_label, isChatAvailable, children, firstItems) => {
      const config = [
        { section: "main", children: ["docs"] },
        { section: "Support", children },
        { section: "Community", children: ["discord"] }
      ];
      expect(resolveHelpSections(config, isChatAvailable)).toEqual([
        { heading: undefined, items: firstItems },
        { heading: "Community", items: ["discord"] }
      ]);
    }
  );

  it("keeps the first section when it holds only code-owned tiles", () => {
    const config = [
      { section: "Support", children: ["troubleshoot", "chat"] },
      { section: "More", children: [] }
    ];
    expect(resolveHelpSections(config, true)).toEqual([
      { heading: "Support", items: ["troubleshoot", "chat"] }
    ]);
  });

  it("keeps a configured Chat entry for users without the chat tile", () => {
    const config = [{ section: "main", children: ["chat"] }];
    expect(resolveHelpSections(config, false)[0].items).toEqual([
      "troubleshoot",
      "chat"
    ]);
  });
});
