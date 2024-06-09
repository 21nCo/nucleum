import {
  PersistanceActionType,
  type IMutationQueueParams
} from "../types/data.type";
import type { DbRecord } from "../types/dbrecord.type";
import type { Item } from "../types/item.enum";
import { prefixTable } from "../utils/text.utils";
import { generateUID } from "../utils/utils";
import { dataManager } from "./dataManager";

/**
 * For IFR Resources - delegated from active resource stores.
 */
export class ResourcePersistence {
  currentUserId: string;
  resourceType: Item;
  constructor(resourceType: Item, currentUserId: string) {
    this.resourceType = resourceType;
    this.currentUserId = currentUserId;
  }
  refresh() {
    return dataManager.refreshForIFR(this.resourceType);
  }
  create(
    resource: Partial<DbRecord>,
    customQuery?: string,
    mutatationQueueParams?: IMutationQueueParams
  ) {
    let data;
    let commonProps = {
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      createdBy: this.currentUserId,
      modifiedBy: this.currentUserId
    };
    if (customQuery && "resources" in resource) {
      data = {
        ...resource,
        resources: resource.resources?.map((r) => ({
          ...r,
          id: r.id ?? prefixTable(generateUID(), this.resourceType),
          ...commonProps
        }))
      };
    } else {
      data = {
        ...resource,
        id: resource.id ?? prefixTable(generateUID(), this.resourceType),
        ...commonProps
      };
    }
    return dataManager.performMutationForIFR(this.resourceType, data, {
      action: customQuery
        ? PersistanceActionType.CUSTOM_CREATE
        : PersistanceActionType.CREATE,
      query: customQuery,
      queueParams: mutatationQueueParams
    });
  }
  async modify(
    id: string,
    resource: Partial<DbRecord>,
    mutatationQueueParams?: IMutationQueueParams
  ) {
    const data: Partial<DbRecord> = {
      id,
      ...resource,
      modifiedBy: this.currentUserId
    };
    return dataManager.performMutationForIFR(this.resourceType, data, {
      action: PersistanceActionType.MERGE,
      queueParams: mutatationQueueParams
    });
  }
  async delete(id: string, mutatationQueueParams?: IMutationQueueParams) {
    return dataManager.performMutationForIFR(
      this.resourceType,
      { id, modifiedBy: this.currentUserId },
      {
        action: PersistanceActionType.DELETE,
        queueParams: mutatationQueueParams
      }
    );
  }
}
