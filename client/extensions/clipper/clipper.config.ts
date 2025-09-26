import { accessLogStore } from "$lib/client/components/accessLogging/accesslog.store";
import { collectionStore } from "$lib/client/components/collection/collection.store";
import { propertyStore } from "$lib/client/components/collection/properties/property.store";
import { viewStore } from "$lib/client/components/collection/view.store";
import { fileStore } from "$lib/client/components/files/file.store";
import { markdownSettings } from "$lib/client/components/markdown/markdown.settings";
import { highlightStore } from "$lib/client/products/memotron/common/highlighters/highlight.store";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import { linkTagStore } from "$lib/client/products/memotron/linking/link.store";
import { nodeStore } from "$lib/client/products/memotron/node/node.store";
import type { IStore } from "$lib/client/types/data.type";
import { toolbarState, webpage } from "./contentScripts/store";

export const clipperCacheableStores: IStore[] = [
  nodeStore,
  collectionStore,
  propertyStore,
  linkTagStore,
  linker,
  highlightStore,
  fileStore,
  viewStore,
  markdownSettings,
  toolbarState,
  webpage
];

export const clipperRemoteOnlyStores: IStore[] = [accessLogStore];

export default {
  stores: {
    cacheableStores: clipperCacheableStores,
    remoteOnlyStores: clipperRemoteOnlyStores
  }
};
