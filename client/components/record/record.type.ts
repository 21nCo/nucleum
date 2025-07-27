import type { Resource } from "../flux/resourceStores/resource.enum";

export type IRecentsStore = {
  recents: {
    type: Resource;
    timestamp: Date;
    record: any;
  }[];
  isInitialized: boolean;
};
