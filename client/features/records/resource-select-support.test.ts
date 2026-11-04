// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  table: vi.fn(),
  successToast: vi.fn()
}));

vi.mock("@nucleum/shared-state/app-context/app.store", () => ({
  appStore: {
    openResource: vi.fn(),
    closeResource: vi.fn(),
    runAction: vi.fn(),
    toggleFullScreen: vi.fn()
  }
}));

vi.mock("@nucleum/shared-state/resources/active-resource.store", () => ({
  copyActiveResourceContents: vi.fn(),
  updateActiveResource: vi.fn()
}));

vi.mock("@nucleum/shared-state/resources/bulkedit.store", () => ({
  bulkEditStore: {
    getState: vi.fn().mockReturnValue({ selectedIds: [] }),
    matchesContext: vi.fn().mockReturnValue(false),
    activate: vi.fn(),
    select: vi.fn()
  }
}));

vi.mock("@nucleum/features/records/bulk-editor", () => ({
  BulkEditor: class {
    run = vi.fn();
  }
}));

vi.mock("@nucleum/shell/navigation/resource-link.utils", () => ({
  copyResourceLinkToClipboard: vi.fn()
}));

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: {
    getState: vi.fn().mockReturnValue([])
  }
}));

vi.mock("@nucleum/shell/topNav/tabs/tabs.store", () => ({
  tabs: {
    open: vi.fn(),
    remove: vi.fn()
  }
}));

vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts: {
    success: mocks.successToast
  }
}));

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: {
    table: mocks.table
  }
}));

import { ResourceActions } from "@nucleum/features/records/resource.actions";

describe("ResourceActions.selectIfSupported", () => {
  const resource = {
    id: "node:select-support",
    createdAt: 0,
    updatedAt: 0
  };

  it("offers Select where bulk selection has toolbar actions", () => {
    const actions = new ResourceActions(resource, {
      accessPoint: ResourceAccessPoint.LIBRARY
    });
    expect(
      actions
        .selectIfSupported(ResourceAccessPoint.LIBRARY)
        .map((item) => item.label)
    ).toEqual(["Select"]);
  });

  it("omits Select for cards shown inside a space", () => {
    const actions = new ResourceActions(resource, {
      accessPoint: ResourceAccessPoint.SPACE
    });
    expect(
      actions.selectIfSupported(ResourceAccessPoint.SPACE, "space:wall")
    ).toEqual([]);
  });
});
