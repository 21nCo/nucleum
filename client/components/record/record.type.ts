import type { Resource } from "@21n/components/flux/resourceStores/resource.enum";

export type IRecentsStore = {
  recents: {
    type: Resource;
    timestamp: Date;
    record: any;
  }[];
  isInitialized: boolean;
};
