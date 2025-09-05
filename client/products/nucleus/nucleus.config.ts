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
import {
  manualLogStore,
  sessionLogStore
} from "$lib/client/products/pointron/logs/log.store";
import { pointronPreferences } from "../pointron/pointron.store";
import { nucleusActions } from "./nucleus.actions";
import NucleusBaseLayer from "./base/NucleusBaseLayer.svelte";

const nucleusCacheableStores: IStore[] = [
  nodeStore,
  goalStore,
  taskStore,
  collectionStore,
  propertyStore,
  viewStore,
  captureStore,
  fileStore,
  linker,
  linkTagStore,
  markdownSettings,
  analyticsConfigStore,
  pointronPreferences,
  focusItemsStore,
  activeSession,
  manualLogStore,
  sessionLogStore,
  sessionStore
];

const nucleusRemoteOnlyStores: IStore[] = [vectorResourceStore, accessLogStore];

export default {
  actions: nucleusActions,
  base: NucleusBaseLayer,
  stores: {
    cacheableStores: nucleusCacheableStores,
    remoteOnlyStores: nucleusRemoteOnlyStores
  }
};
