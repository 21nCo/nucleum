import { NextResource } from "./resource.enum";

export const nextResourceIcons: Record<string, string> = {
  [NextResource.email]: "envelope",
  [NextResource.fellow]: "user",
  [NextResource.organization]: "user",
  [NextResource.account]: "bank",
  [NextResource.transaction]: "arrows-left-right",
  [NextResource.category]: "tag",
  [NextResource.budget]: "wallet",
  [NextResource.feed]: "rss",
  [NextResource.source]: "globe",
  [NextResource.habit]: "habit",
  [NextResource.activity]: "activity",
  [NextResource.quest]: "experiment",
  [NextResource.thing]: "bicycle",
};

/**
 * Resources whose label should not be pluralized (i.e. use properCase without "s").
 */
export const nextUncountableResources = new Set<string>([
  NextResource.email,
  NextResource.activity,
]);
