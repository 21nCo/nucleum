import Dexie, { type Table } from "dexie";
import type { IAccessLog } from "../components/accessLogging/accessLog.type";
import type { IResource } from "../components/flux/resourceStores/resource.type";
import type { IMutation } from "../types/data.type";

export interface MutationQueue {
  id: string;
  timestamp: number;
  query: string;
  params: any;
  retryCount: number;
  isInProgress: boolean;
  mutatingResources: string[];
}

interface TestDexieRecord {
  id: string;
  label: string;
  context: string;
}

export class AppDexie extends Dexie {
  protected dbVersion: number = 27;
  test!: Table<TestDexieRecord>;
  mutationQueuev2!: Table<MutationQueue>;
  accessLog!: Table<IAccessLog>;
  kv!: Table<IResource>;
  mutation!: Table<IMutation>;
  constructor(scope: string) {
    super(scope);
    this.version(this.dbVersion).stores({
      mutationQueuev2: "id, timestamp, retryCount",
      test: "id",
      accessLog: "id, action, resource, resourceId, timestamp",
      kv: "id",
      mutation: "id, resource, createdAt"
    });
  }
}
