import {
  collectionStore,
  viewStore
} from "$lib/client/products/memotron/collection/collection.store";
import { nodeStore } from "$lib/client/products/memotron/node/node.store";
import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
import { typeStore } from "$lib/client/products/memotron/collection/properties/type.store";
import type { IStore } from "$lib/client/types/data.type";
import { propertyStore } from "./collection/properties/property.store";

export const memotronCacheableStores: IStore[] = [
  nodeStore,
  collectionStore,
  typeStore,
  propertyStore,
  viewStore,
  captureStore
];
