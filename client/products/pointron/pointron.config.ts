import { analyticsConfigStore } from "$lib/client/products/pointron/analytics/analytics.store";
import {
  focusItemsStore,
  sessionStore,
  activeSession
} from "$lib/client/products/pointron/focus/session.store";
import { focusHeatmapStore } from "$lib/client/products/pointron/journal/journal.store";
import { accessLogStore } from "$lib/client/components/accessLogging/accesslog.store";
import {
  logsPaneStore,
  manualLogStore,
  sessionLogStore
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
import { goalStore } from "$lib/client/components/goals/goal.store";
import { taskStore } from "$lib/client/components/tasks/task.store";

export const pointronCacheableStores: IStore[] = [
  analyticsConfigStore,
  pointronPreferences,
  focusItemsStore,
  activeSession,
  logsPaneStore,
  tagStore,
  manualLogStore,
  focusHeatmapStore,
  sessionLogStore,
  sessionStore,
  collectionStore,
  viewStore,
  goalStore,
  taskStore
];

export const pointronRemoteOnlyStores: IStore[] = [accessLogStore];
