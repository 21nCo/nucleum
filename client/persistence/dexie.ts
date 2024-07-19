import Dexie, { type Table } from "dexie";

export interface MutationQueue {
  id: string;
  timestamp: number;
  query: string;
  params: any;
  retryCount: number;
}

interface TestDexieRecord {
  id: string;
  label: string;
  context: string;
}

export class AppDexie extends Dexie {
  protected dbVersion: number = 17;
  test!: Table<TestDexieRecord>;
  mutationQueuev2!: Table<MutationQueue>;
  constructor(scope: string) {
    super(scope);
    this.version(this.dbVersion).stores({
      mutationQueuev2: "id, timestamp, retryCount",
      test: "id"
    });
  }
}
