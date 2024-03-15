import Dexie, { type Table } from "dexie";

export interface MutationQueue {
  timestamp: number;
  query: string;
  params: any;
}

export class AppDixie extends Dexie {
  mutationQueue!: Table<MutationQueue>;
  constructor(scope: string) {
    super(scope);
    this.version(1).stores({
      mutationQueue: "timestamp"
    });
  }
}
