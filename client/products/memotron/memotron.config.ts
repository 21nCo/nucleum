import { collectionStore } from "$lib/client/products/memotron/curation/collection/collection.store";
import { nodeStore } from "$lib/client/products/memotron/node/node.store";
import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
import { typeStore } from "$lib/client/products/memotron/type/type.store";
import type { IStore } from "$lib/client/types/data.type";

export const memotronCacheableStores: IStore[] = [
  nodeStore,
  collectionStore,
  typeStore,
  captureStore
];
