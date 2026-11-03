import { describe, expect, it } from "vitest";
import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import {
  combinePageViewSegments,
  createPageViewActions,
  resolvePageRoute
} from "./page-view-actions";

const PageComponent = () => null;
const calendar: IAction = {
  action: "calendar",
  label: "Calendar",
  icon: "calendar",
  type: ActionType.PAGE,
  component: PageComponent
};
const settings: IAction = {
  action: "settings",
  label: "Settings",
  type: ActionType.PAGE,
  component: PageComponent
};
const alerts: IAction = {
  action: "alerts",
  path: "cp/alerts",
  type: ActionType.PAGE,
  component: PageComponent
};
const calendarViews = createPageViewActions(
  calendar,
  combinePageViewSegments(
    [{ slug: "classic", label: "Classic" }],
    [
      { slug: "month", label: "Month" },
      { slug: "year", label: "Year" }
    ]
  )
);
const actions = [calendar, settings, alerts, ...calendarViews];

describe("createPageViewActions", () => {
  it("derives ids, paths, labels and icon from the parent page", () => {
    expect(calendarViews.map((action) => action.action)).toEqual([
      "calendar.classic.month",
      "calendar.classic.year"
    ]);
    expect(calendarViews[1]).toMatchObject({
      path: "calendar/classic/year",
      label: "Calendar › Classic › Year",
      icon: "calendar",
      type: ActionType.PAGE,
      component: PageComponent,
      subViewOf: "calendar"
    });
    expect(calendarViews[1].isMeta).toBeUndefined();
  });

  it("marks views as meta when requested", () => {
    const [view] = createPageViewActions(
      calendar,
      [[{ slug: "a", label: "A" }]],
      {
        isMeta: true
      }
    );
    expect(view.isMeta).toBe(true);
  });
});

describe("resolvePageRoute", () => {
  it("resolves a registered sub-view path through its parent page", () => {
    expect(resolvePageRoute(actions, "calendar/classic/year")).toEqual({
      action: calendar,
      subPath: ["classic", "year"]
    });
  });

  it("passes unknown sub-paths to pages with sub-views", () => {
    expect(resolvePageRoute(actions, "calendar/unknown")).toEqual({
      action: calendar,
      subPath: ["unknown"]
    });
    expect(resolvePageRoute(actions, "calendar")).toEqual({
      action: calendar,
      subPath: []
    });
  });

  it("resolves a sub-view action id through its parent page", () => {
    expect(resolvePageRoute(actions, "calendar.classic.year")).toEqual({
      action: calendar,
      subPath: ["classic", "year"]
    });
  });

  it("keeps exact matching for pages without sub-views", () => {
    expect(resolvePageRoute(actions, "settings")).toEqual({ action: settings });
    expect(resolvePageRoute(actions, "cp/alerts")).toEqual({ action: alerts });
    expect(resolvePageRoute(actions, "settings/extra")).toBeNull();
    expect(resolvePageRoute(actions, "missing")).toBeNull();
  });
});
