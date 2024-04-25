import Dexie, { type Table } from "dexie";

export interface MutationQueue {
  timestamp: number;
  query: string;
  params: any;
}

interface TestDexieRecord {
  id: string;
  label: string;
  context: string;
}

export class AppDexie extends Dexie {
  protected dbVersion: number = 8;
  test!: Table<TestDexieRecord>;
  mutationQueue!: Table<MutationQueue>;
  constructor(scope: string) {
    super(scope);
    this.version(this.dbVersion).stores({
      mutationQueue: "timestamp",
      test: "id"
    });
  }
}
