import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { Resource } from "@nucleum/datafn/resource.enum";

const { savedSubType, replacePagePath } = vi.hoisted(() => ({
  savedSubType: { value: undefined as unknown },
  replacePagePath: vi.fn()
}));

vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: () => savedSubType.value }
}));

vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { replacePagePath }
}));

import {
  createLibraryViewActions,
  isLibraryPathRouted,
  parseLibraryPath,
  parseLibrarySubType,
  replaceLibraryPath,
  resolveLibraryFallbackSubType
} from "./library-route";

const PageComponent = () => null;
const library: IAction = {
  action: "library",
  label: "Library",
  icon: "library",
  type: ActionType.PAGE,
  component: PageComponent
};
const home: IAction = {
  action: "home",
  label: "Home",
  type: ActionType.PAGE,
  component: PageComponent
};

describe("library-route", () => {
  beforeEach(() => {
    savedSubType.value = undefined;
    replacePagePath.mockReset();
  });

  it("parses the resource and a valid subtype from a library path", () => {
    expect(parseLibraryPath("/library/collection/all")).toEqual({
      base: "library",
      resource: Resource.collection,
      subType: "all"
    });
    expect(parseLibraryPath("/library/objective/DEFINITE")).toEqual({
      base: "library",
      resource: Resource.objective,
      subType: "definite"
    });
  });

  it("drops unknown resources and subtypes", () => {
    expect(parseLibraryPath("/library/unknown/all")).toEqual({
      base: "library",
      resource: undefined,
      subType: undefined
    });
    expect(parseLibrarySubType(Resource.collection, "not-a-type")).toBe(
      undefined
    );
  });

  it("falls back to the saved task subtype and to all otherwise", () => {
    expect(resolveLibraryFallbackSubType(Resource.collection)).toBe("all");
    savedSubType.value = "not-a-type";
    expect(resolveLibraryFallbackSubType(Resource.task)).toBe("all");
  });

  it("rewrites the library path on its own base", () => {
    window.history.replaceState(null, "", "/librarypt/node/all");
    replaceLibraryPath(Resource.collection, "all", { isResetFilters: true });
    expect(replacePagePath).toHaveBeenCalledWith(
      ["librarypt", Resource.collection, "all"],
      { starred: null, archived: null }
    );
    replaceLibraryPath();
    expect(replacePagePath).toHaveBeenLastCalledWith(["librarypt"], undefined);
  });

  it("creates an all view and one view per subtype for each resource", () => {
    const actions = createLibraryViewActions(library, [
      Resource.objective,
      Resource.objective,
      Resource.event
    ]);
    expect(actions.map((action) => action.path)).toEqual([
      "library/objective/all",
      "library/objective/indefinite",
      "library/objective/definite",
      "library/event/all"
    ]);
    expect(actions.every((action) => action.subViewOf === "library")).toBe(
      true
    );
  });

  it("routes a library only when the URL resolves to the painted page", () => {
    const actions = [
      library,
      home,
      ...createLibraryViewActions(library, [Resource.collection])
    ];
    expect(
      isLibraryPathRouted(actions, library, "/library/collection/all")
    ).toBe(true);
    expect(isLibraryPathRouted(actions, library, "/library")).toBe(true);
    expect(isLibraryPathRouted(actions, library, "/home")).toBe(false);
    expect(isLibraryPathRouted(actions, home, "/library")).toBe(false);
    expect(isLibraryPathRouted(actions, undefined, "/library")).toBe(false);
  });
});
