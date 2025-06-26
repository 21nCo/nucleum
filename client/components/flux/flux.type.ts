import type { PersistenceProvider } from "$lib/client/persistence/persistence.type";
import type {
  IMutationParamsv2,
  IRecordId,
  IResourceSelectParams,
  IStore
} from "$lib/client/types/data.type";
import type { Resource } from "./resourceStores/resource.enum";

export enum FluxMethod {
  CLONE_DOWN = "cloneDown",
  SYNC_DOWN = "syncDown",
  RECONCILE = "reconcile",
  INIT_FLUX = "initFlux",
  SELECT_MANY = "selectMany",
  SELECT = "select",
  MUTATION = "mutation",
  KV_MERGE = "kvMerge",
  SEARCH = "search"
}

export type IFluxMethod =
  | {
      method: FluxMethod.SELECT_MANY;
      args: IFluxSelectManyArgs;
    }
  | {
      method: FluxMethod.SELECT;
      args: IFluxSelectArgs;
    }
  | {
      method: FluxMethod.MUTATION;
      args: IFluxMutationArgs<any>;
    }
  | {
      method: FluxMethod.INIT_FLUX;
      args: IFluxInitArgs;
    }
  | {
      method: FluxMethod.KV_MERGE;
      args: IFluxKVMergeArgs;
    }
  | {
      method: FluxMethod.CLONE_DOWN;
  }
  | {
    method: FluxMethod.SYNC_DOWN;
    args: IFluxSyncDownArgs;
  }
  | {
      method: FluxMethod.RECONCILE;
      args: IFluxReconcileArgs;
    }
  | {
      method: FluxMethod.SEARCH;
      args: IFluxSearchArgs;
    };

interface IFluxReconcileArgs {
  counts: {
    [key: string]: number;
  };
}

interface IFluxSyncDownArgs {
  isReturnCount?: boolean;
}

interface IFluxSelectManyArgs {
  resource: Resource;
  params?: IResourceSelectParams;
  signal?: AbortSignal;
}

interface IFluxSelectArgs {
  resourceId: IRecordId;
  properties?: string[];
  signal?: AbortSignal;
}

interface IFluxMutationArgs<T> {
  resource: Resource;
  params: IMutationParamsv2<T>;
  additionalParams?: {
    isPreventCloudPersistence?: boolean;
    isCloudOnlyResource?: boolean;
    context?: string;
  };
}

interface IFluxInitArgs {
  stores: IStore[];
  provider: PersistenceProvider;
  params: {
    dapId: string;
    userId?: string;
    isLocalMode?: boolean;
  };
}

interface IFluxKVMergeArgs {
  storeId: string;
  data: any;
}

interface IFluxSearchArgs {
  storeId: string;
  query: string;
}
