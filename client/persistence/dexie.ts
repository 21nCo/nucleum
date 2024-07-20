import Dexie, { type Table } from "dexie";
import type { IAccessLog } from "../components/accessLogging/accessLog.type";

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
  protected dbVersion: number = 18;
  test!: Table<TestDexieRecord>;
  mutationQueuev2!: Table<MutationQueue>;
  accessLog!: Table<IAccessLog>;
  constructor(scope: string) {
    super(scope);
    this.version(this.dbVersion).stores({
      mutationQueuev2: "id, timestamp, retryCount",
      test: "id",
      accessLog: "id, action, resource, resourceId, timestamp"
    });
  }
}
