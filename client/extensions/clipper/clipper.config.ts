import type { IStore } from "$lib/client/types/data.type";
import { collectionStore } from "$lib/client/components/collection/collection.store";
import { viewStore } from "$lib/client/components/collection/view.store";
import { nodeStore } from "$lib/client/products/memotron/node/node.store";
import { propertyStore } from "$lib/client/components/collection/properties/property.store";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import { fileStore } from "$lib/client/components/files/file.store";
import { linkTagStore } from "$lib/client/products/memotron/linking/link.store";
import { accessLogStore } from "$lib/client/components/accessLogging/accesslog.store";
import { markdownSettings } from "$lib/client/components/markdown/markdown.settings";

export const clipperCacheableStores: IStore[] = [
  nodeStore,
  collectionStore,
  propertyStore,
  viewStore,
  fileStore,
  linker,
  linkTagStore,
  markdownSettings
];

export const clipperRemoteOnlyStores: IStore[] = [accessLogStore];
