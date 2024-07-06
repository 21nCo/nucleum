import { analyticsConfigStore } from "$lib/client/products/pointron/analytics/analytics.store";
import {
  focusItemsStore,
  sessionStore
} from "$lib/client/products/pointron/focus/session.store";
import {
  goalStore,
  quickFocusItemStore
} from "$lib/client/products/pointron/goals/goal.store";
import { focusHeatmapStore } from "$lib/client/products/pointron/journal/journal.store";

import {
  logsPaneStore,
  pointLogStore
} from "$lib/client/products/pointron/logs/log.store";
import {
  pointronPreferences,
  tagStore
} from "$lib/client/products/pointron/pointron.store";
import type { IStore } from "$lib/client/types/data.type";

export const pointronCacheableStores: IStore[] = [
  analyticsConfigStore,
  pointronPreferences,
  focusItemsStore,
  sessionStore,
  logsPaneStore,
  goalStore,
  tagStore,
  quickFocusItemStore,
  pointLogStore,
  focusHeatmapStore
];
