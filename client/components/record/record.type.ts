import type { Resource } from "@21n/data/datafn/resource.enum";

export type IRecentsStore = {
  recents: {
    type: Resource;
    timestamp: Date;
    record: any;
  }[];
  isInitialized: boolean;
};
