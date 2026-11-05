import { describe, expect, it } from "vitest";
import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { resolvePageRoute } from "@nucleum/shared-state/commands/page-view-actions";

const spacePage: IAction = {
  action: "space",
  type: ActionType.PAGE,
  isSubPathOpen: true
};
const libraryPage: IAction = { action: "library", type: ActionType.PAGE };

describe("open sub-path pages", () => {
  it("passes any trailing segments as the sub-path", () => {
    expect(resolvePageRoute([spacePage, libraryPage], "space/a/b")).toEqual({
      action: spacePage,
      subPath: ["a", "b"]
    });
    expect(resolvePageRoute([spacePage], "space")).toEqual({
      action: spacePage,
      subPath: []
    });
  });

  it("keeps pages without sub-views exact", () => {
    expect(resolvePageRoute([spacePage, libraryPage], "library/x")).toBeNull();
  });
});
