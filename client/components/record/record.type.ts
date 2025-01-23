import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import type { Resource } from "../flux/resourceStores/resource.enum";

export type IRecentsStore = IObservableStoreSubject & {
  recents: {
    type: Resource;
    timestamp: Date;
    record: any;
  }[];
  isInitialized: boolean;
};
