import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { IMutation } from "$lib/client/types/data.type";

export enum SyncMethod {
  SYNC_UP = "up",
  SYNC_DOWN = "down",
  CLONE_UP = "cloneup",
  CLONE_DOWN = "clonedown",
  CLONE_DOWN_PAGINATE = "clonedown_paginate"
}

export type ISyncUpBody = {
  mutations: IMutation[];
  lastSyncDown: number;
  resources: Resource[];
  dapId: string;
};

export type ISyncDownBody = {
  lastSyncDown: number;
  resources: Resource[];
  dapId: string;
};

export type ICloneUpBody = {
  resource: Resource;
  records: any[];
};

export type ICloneDownBody = {
  resources: Resource[];
  limit?: number;
  isExtension: boolean;
};

export type ICloneDownPaginateBody = {
  resource: Resource;
  isExtension: boolean;
  offset: number;
  limit: number;
};
