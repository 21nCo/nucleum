import { accessLogStore } from "@21n/components/accessLogging/accesslog.store";
import { collectionStore } from "@21n/components/collection/collection.store";
import { propertyStore } from "@21n/components/collection/properties/property.store";
import { viewStore } from "@21n/components/collection/view.store";
import { fileStore } from "@21n/components/files/file.store";
import { markdownSettings } from "@21n/components/markdown/markdown.settings";
import { highlightStore } from "@21n/products/memotron/common/highlighters/highlight.store";
import { linker } from "@21n/products/memotron/linking/link.store";
import { linkTagStore } from "@21n/products/memotron/linking/link.store";
import { nodeStore } from "@21n/products/memotron/node/node.store";
import type { IStore } from "@21n/types/data.type";
import { toolbarState, webpage } from "@21n/extensions/clipper/contentScripts/store";

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
