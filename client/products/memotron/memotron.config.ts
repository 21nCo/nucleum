import {
  collectionStore,
  viewStore
} from "$lib/client/products/memotron/collection/collection.store";
import {
  nodeStore,
  vectorResourceStore
} from "$lib/client/products/memotron/node/node.store";
import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
import type { IStore } from "$lib/client/types/data.type";
import { propertyStore } from "./collection/properties/property.store";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import { fileStore } from "$lib/client/components/files/file.store";
import { linkTagStore } from "$lib/client/products/memotron/linking/link.store";
import { accessLogStore } from "$lib/client/components/accessLogging/accesslog.store";
import { markdownSettings } from "$lib/client/components/markdown/markdown.settings";

export const memotronCacheableStores: IStore[] = [
  vectorResourceStore,
  nodeStore,
  collectionStore,
  propertyStore,
  viewStore,
  captureStore,
  fileStore,
  linker,
  linkTagStore,
  accessLogStore,
  markdownSettings
];
