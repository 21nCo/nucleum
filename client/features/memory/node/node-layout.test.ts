import { describe, expect, it } from "vitest";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import { ResourcePanelType } from "@nucleum/shared-state/resources/resource-panel.type";
import {
  isNodeSidePanelOpen,
  resolveNodeMinWidth
} from "@nucleum/features/memory/node/node-layout";

describe("resolveNodeMinWidth", () => {
  it("gives markdown and heading nodes the three-column width", () => {
    expect(
      resolveNodeMinWidth({ contentType: NodeType.NODULAR_MARKDOWN })
    ).toBe(1200);
    expect(resolveNodeMinWidth({ contentType: NodeType.HEADING2 })).toBe(1200);
  });

  it("gives other nodes the two-column width", () => {
    expect(resolveNodeMinWidth({ contentType: NodeType.TWEET })).toBe(1000);
  });

  it("needs room for the content and an open side panel", () => {
    expect(
      resolveNodeMinWidth({
        contentType: NodeType.HEADING2,
        panel: ResourcePanelType.OVERVIEW
      })
    ).toBe(1296);
    expect(
      resolveNodeMinWidth(
        {
          contentType: NodeType.NODULAR_MARKDOWN,
          panel: ResourcePanelType.ACTIVITY
        },
        20
      )
    ).toBe(1620);
  });

  it("ignores the side panel in focus mode", () => {
    expect(
      resolveNodeMinWidth({
        contentType: NodeType.HEADING2,
        panel: ResourcePanelType.OVERVIEW,
        isInFocusMode: true
      })
    ).toBe(1200);
  });
});

describe("isNodeSidePanelOpen", () => {
  it("treats content and default as no side panel", () => {
    expect(isNodeSidePanelOpen(ResourcePanelType.CONTENT)).toBe(false);
    expect(isNodeSidePanelOpen(ResourcePanelType.DEFAULT)).toBe(false);
    expect(isNodeSidePanelOpen(ResourcePanelType.NONE)).toBe(false);
    expect(isNodeSidePanelOpen(undefined)).toBe(false);
    expect(isNodeSidePanelOpen(ResourcePanelType.LINKS)).toBe(true);
  });
});
