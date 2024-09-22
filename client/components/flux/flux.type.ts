import type { PersistenceProvider } from "$lib/client/persistence/persistence.type";
import type { IMutationParamsv2, IRecordId, IResourceSelectParams, IStore } from "$lib/client/types/data.type";
import type { Resource } from "./resourceStores/resource.enum";

export enum FluxMethod {
    CLONE_DOWN = "cloneDown",
    SYNC_DOWN = "syncDown",
    INIT_FLUX = "initFlux",
    SELECT_MANY = "selectMany",
    SELECT = "select",
    MUTATION = "mutation",
    KV_MERGE = "kvMerge",
}

export type IFluxMethod = {
    method: FluxMethod.SELECT_MANY;
    args: IFluxSelectManyArgs;
} | {
    method: FluxMethod.SELECT;
    args: IFluxSelectArgs;
} | {
    method: FluxMethod.MUTATION;
    args: IFluxMutationArgs<any>;
} | {
    method: FluxMethod.INIT_FLUX;
    args: IFluxInitArgs;
} | {
    method: FluxMethod.KV_MERGE;
    args: IFluxKVMergeArgs;
} | {
    method: FluxMethod.CLONE_DOWN | FluxMethod.SYNC_DOWN;
}

interface IFluxSelectManyArgs {
    resource: Resource;
    params?: IResourceSelectParams;
}

interface IFluxSelectArgs {
    resourceId: IRecordId;
    properties?: string[];
}

interface IFluxMutationArgs<T> {
    resource: Resource;
    params: IMutationParamsv2<T>
}

interface IFluxInitArgs {
    stores: IStore[];
    provider: PersistenceProvider;
    userId: string;
    params?: {
      isLocalMode?: boolean;
    };
}

interface IFluxKVMergeArgs {
    storeId: string;
    data: any;
}