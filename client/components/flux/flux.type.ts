import type {
  IPersistence,
  PersistenceProvider
} from "$lib/client/persistence/persistence.type";
import type { UiStateStoreType } from "$lib/client/stores/uiState/uiState.store";
import type {
  IMutationParamsv2,
  IRecordId,
  IResourceSelectParams,
  IStore
} from "$lib/client/types/data.type";
import type { KeyboardShortcutsStoreType } from "../shortcuts/shortcuts.store";
// import type { KeyValueStore } from "./resourceStores/kv.store";
import type { Resource } from "./resourceStores/resource.enum";
// import type { ResourceStore } from "./resourceStores/resource.store";
import type { IResource } from "./resourceStores/resource.type";

export type FluxStoreType = UiStateStoreType | KeyboardShortcutsStoreType;
export type FluxStoreConstructor = new (...args: any[]) => FluxStoreType;

export type IFlux = {
  [key: string]: FluxStoreType;
} & {
  provider: PersistenceProvider;
  persistence: IPersistence;
  mutation: <T extends IResource>(
    resource: Resource,
    params: IMutationParamsv2<T>
  ) => Promise<any>;
  selectMany: <T extends IResource>(
    resource: Resource,
    params?: IResourceSelectParams
  ) => Promise<any>;
  select: <T extends IResource>(
    resourceId: IRecordId,
    properties?: string[]
  ) => Promise<any>;
  kvMerge: (storeId: string, data: any) => Promise<any>;
  initialize: (
    stores: IStore[],
    userId: string,
    params?: {
      isLocalMode?: boolean;
    }
  ) => Promise<void>;
  seed: () => Promise<void>;
  search(storeId: string, query: string): Promise<any>;
};
