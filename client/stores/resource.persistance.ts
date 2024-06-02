import { PersistanceActionType } from "../types/data.type";
import type { DbRecord } from "../types/dbrecord.type";
import type { ItemType } from "../types/item.enum";
import { prefixTable } from "../utils/text.utils";
import { generateUID } from "../utils/utils";
import { dataManager } from "./data.store";

/**
 * For IFR Resources - delegated from active resource stores.
 */
export class ResourcePersistance {
  currentUserId: string;
  resourceType: ItemType;
  constructor(resourceType: ItemType, currentUserId: string) {
    this.resourceType = resourceType;
    this.currentUserId = currentUserId;
  }
  refresh() {
    return dataManager.refreshForIFR(this.resourceType);
  }
  create(resource: Partial<DbRecord>, customQuery?: string) {
    const data: Partial<DbRecord> = {
      ...resource,
      id: resource.id ?? prefixTable(generateUID(), this.resourceType),
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      createdBy: this.currentUserId,
      modifiedBy: this.currentUserId
    };
    return dataManager.performMutationForIFR(
      this.resourceType,
      customQuery
        ? PersistanceActionType.CUSTOM_CREATE
        : PersistanceActionType.CREATE,
      data,
      customQuery
    );
  }
  async modify(id: string, resource: Partial<DbRecord>) {
    const data: Partial<DbRecord> = {
      id,
      ...resource,
      modifiedBy: this.currentUserId
    };
    return dataManager.performMutationForIFR(
      this.resourceType,
      PersistanceActionType.MERGE,
      data
    );
  }
  async delete(id: string) {
    return dataManager.performMutationForIFR(
      this.resourceType,
      PersistanceActionType.DELETE,
      { id, modifiedBy: this.currentUserId }
    );
  }
}
