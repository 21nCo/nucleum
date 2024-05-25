import { AppDexie } from "$lib/client/stores/dexie";
import type { Table } from "dexie";
import type { CurationLocalRecord } from "../types/memotron/curation.type";
import type { NodeLocalRecord } from "$lib/client/types/memotron/node.type";
import type { TypeLocalRecord } from "../types/memotron/type.type";

export class MemotronDexie extends AppDexie {
  node!: Table<NodeLocalRecord>;
  curation!: Table<CurationLocalRecord>;
  type!: Table<TypeLocalRecord>;
  constructor(scope: string) {
    super(scope);
    this.version(this.dbVersion)
      .stores({
        node: "id, title, createdAt, modifiedAt",
        curation: "id, type, label, createdAt, modifiedAt",
        type: "id, label, createdAt, modifiedAt"
      })
      .upgrade((tx) => {
        //Handle version upgrades here - in case of change of table schema on db
        return tx
          .table("node")
          .toCollection()
          .modify((data) => {
            // Rename 'created' to 'createdAt'
            if (data.created) {
              data.createdAt = data.created;
              delete data.created;
            }
          });
      });
  }
}
