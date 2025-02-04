import { analyticsConfigStore } from "$lib/client/products/pointron/analytics/analytics.store";
import {
  focusItemsStore,
  pointSessionStore,
  sessionStore
} from "$lib/client/products/pointron/focus/session.store";
import {
  goalStore,
  quickFocusItemStore
} from "$lib/client/products/pointron/goals/goal.store";
import { focusHeatmapStore } from "$lib/client/products/pointron/journal/journal.store";
import { accessLogStore } from "$lib/client/components/accessLogging/accesslog.store";
import {
  logsPaneStore,
  manualLogStore,
  pointLogStore
} from "$lib/client/products/pointron/logs/log.store";
import {
  pointronPreferences,
  tagStore
} from "$lib/client/products/pointron/pointron.store";
import type { IStore } from "$lib/client/types/data.type";
import {
  collectionStore,
  viewStore
} from "$lib/client/components/collection/collection.store";

export const pointronCacheableStores: IStore[] = [
  analyticsConfigStore,
  pointronPreferences,
  focusItemsStore,
  sessionStore,
  logsPaneStore,
  goalStore,
  tagStore,
  quickFocusItemStore,
  manualLogStore,
  focusHeatmapStore,
  pointLogStore,
  pointSessionStore,
  collectionStore,
  viewStore
];

export const pointronRemoteOnlyStores: IStore[] = [accessLogStore];
