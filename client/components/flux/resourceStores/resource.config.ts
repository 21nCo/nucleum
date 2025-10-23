import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import type { IResourceTableConfig } from "@21n/components/flux/flux.type";
import { StoreDataType } from "@21n/types/data.type";
import { CollectionObjectKey } from "@21n/components/collection/collection.type";

/**
 * Resource configuration map
 * This defines all table configuration for resources.
 */
export const resourceConfig: Record<string, IResourceTableConfig> = {
  [Resource.node]: {
    name: Resource.node,
    indices: ["contentType", "metaType", "parent"],
    searchIndices: ["label", "text", "notes"],
    encrypt: ["text"]
  },

  [Resource.vector]: {
    name: Resource.vector,
    indices: [],
    isRemoteOnly: true
  },

  [Resource.accessLog]: {
    name: Resource.accessLog,
    indices: [],
    isRemoteOnly: true
  },

  [Resource.collection]: {
    name: Resource.collection,
    dataType: StoreDataType.FIR,
    indices: ["type", "resource", CollectionObjectKey.typeToExtend],
    searchIndices: ["label"],
    encrypt: ["label"]
  },

  [Resource.property]: {
    name: Resource.property,
    dataType: StoreDataType.FIR
  },

  [Resource.view]: {
    name: Resource.view,
    dataType: StoreDataType.FIR
  },

  [Resource.capture]: {
    name: Resource.capture
  },

  [Resource.file]: {
    name: Resource.file,
    indices: ["type"],
    searchIndices: ["label"],
    encrypt: ["label"]
  },

  [Resource.link]: {
    name: Resource.link,
    indices: ["in", "out", "linkType", "location", "tags"]
  },

  [Resource.linkTag]: {
    name: Resource.linkTag,
    dataType: StoreDataType.FIR,
    isInMemory: true
  },

  [Resource.goal]: {
    name: Resource.goal,
    indices: ["type", "status", "*parent"],
    searchIndices: ["label"],
    encrypt: ["label"]
  },

  [Resource.task]: {
    name: Resource.task,
    indices: ["dateUnix", "goalId"],
    searchIndices: ["label"],
    encrypt: ["label"]
  },

  [Resource.session]: {
    name: Resource.session,
    indices: ["startUnix", "type"]
  },

  [Resource.sessionLog]: {
    name: Resource.sessionLog,
    indices: ["startUnix", "goalId", "sessionId", "taskId"]
  },

  [Resource.tz]: {
    name: Resource.tz,
    indices: ["dateUnix"],
    isInMemory: true
  }
};
