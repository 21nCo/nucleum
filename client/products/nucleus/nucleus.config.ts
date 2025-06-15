import { collectionStore } from "$lib/client/components/collection/collection.store";
import { viewStore } from "$lib/client/components/collection/view.store";
import {
  nodeStore,
  vectorResourceStore
} from "$lib/client/products/memotron/node/node.store";
import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
import type { IStore } from "$lib/client/types/data.type";
import { propertyStore } from "$lib/client/components/collection/properties/property.store";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import { fileStore } from "$lib/client/components/files/file.store";
import { linkTagStore } from "$lib/client/products/memotron/linking/link.store";
import { accessLogStore } from "$lib/client/components/accessLogging/accesslog.store";
import { markdownSettings } from "$lib/client/components/markdown/markdown.settings";
import { goalStore } from "$lib/client/components/goals/goal.store";
import { taskStore } from "$lib/client/components/tasks/task.store";

import { analyticsConfigStore } from "$lib/client/products/pointron/analytics/analytics.store";
import {
  focusItemsStore,
  sessionStore,
  activeSession
} from "$lib/client/products/pointron/focus/session.store";
import { focusHeatmapStore } from "$lib/client/products/pointron/journal/journal.store";
import {
  manualLogStore,
  sessionLogStore
} from "$lib/client/products/pointron/logs/log.store";
import { pointronPreferences } from "../pointron/pointron.store";
import { combinationStore } from "$lib/client/components/combination/combination.store";

export const nucleusCacheableStores: IStore[] = [
  combinationStore,
  collectionStore,
  propertyStore,
  viewStore,
  fileStore,
  linker,

  // Memotron
  captureStore,
  nodeStore,
  markdownSettings,
  linkTagStore,

  // Pointron
  goalStore,
  taskStore,
  analyticsConfigStore,
  pointronPreferences,
  focusItemsStore,
  activeSession,
  manualLogStore,
  focusHeatmapStore,
  sessionLogStore,
  sessionStore
];

export const nucleusRemoteOnlyStores: IStore[] = [
  vectorResourceStore,
  accessLogStore
];
