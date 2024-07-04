import { curationStore } from "$lib/client/products/memotron/curation/curation.store";
import { nodeStore } from "$lib/client/products/memotron/node/node.store";
import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
import { typeStore } from "$lib/client/products/memotron/type/type.store";
import type { ICacheableStore } from "$lib/client/types/data.type";

export const memotronCacheableStores: ICacheableStore[] = [nodeStore, curationStore, typeStore, captureStore];
