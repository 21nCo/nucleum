import { analyticsConfigStore } from "$lib/client/products/pointron/analytics/analytics.store";
import {
  focusItemsStore,
  sessionStore,
  activeSession
} from "$lib/client/products/pointron/focus/session.store";
import { focusHeatmapStore } from "$lib/client/products/pointron/journal/journal.store";
import { accessLogStore } from "$lib/client/components/accessLogging/accesslog.store";
import {
  manualLogStore,
  sessionLogStore
} from "$lib/client/products/pointron/logs/log.store";
import { pointronPreferences } from "./pointron.store";
import type { IStore } from "$lib/client/types/data.type";
import { collectionStore } from "$lib/client/components/collection/collection.store";
import { viewStore } from "$lib/client/components/collection/view.store";
import { goalStore } from "$lib/client/components/goals/goal.store";
import { taskStore } from "$lib/client/components/tasks/task.store";
import { linker } from "../memotron/linking/link.store";
import { propertyStore } from "$lib/client/components/collection/properties/property.store";

export const pointronCacheableStores: IStore[] = [
  analyticsConfigStore,
  pointronPreferences,
  focusItemsStore,
  activeSession,
  manualLogStore,
  focusHeatmapStore,
  sessionLogStore,
  sessionStore,
  collectionStore,
  viewStore,
  goalStore,
  taskStore,
  linker,
  propertyStore
];

export const pointronRemoteOnlyStores: IStore[] = [accessLogStore];
