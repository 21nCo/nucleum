import { Agent } from "$lib/server/common/account/account.type";
import {
  ISyncUpBody,
  ISyncDownBody,
  ICloneUpBody,
  ICloneDownBody,
  ICloneDownPaginateBody,
  IReconcileBody
} from "$lib/shared/types/sync.type";

export enum SyncProvider {
  SURREAL = "surreal",
  DYNAMODB = "dynamodb"
}

export interface ISyncProviderConfig {
  provider: SyncProvider;
}

export interface ISyncProvider {
  name: SyncProvider;
  // Core sync operations
  syncUp(body: ISyncUpBody, agent: Agent): Promise<any>;
  syncDown(body: ISyncDownBody, agent: Agent): Promise<any>;

  // Clone operations
  cloneUp(body: ICloneUpBody, agent: Agent): Promise<any>;
  cloneDown(body: ICloneDownBody, agent: Agent): Promise<any>;

  // Pagination
  paginate(body: ICloneDownPaginateBody, agent: Agent): Promise<any>;

  // Reconciliation
  reconcile(body: IReconcileBody, agent: Agent): Promise<any>;
}
