import type { Table } from "dexie";
import type { NodeLocalRecord } from "$lib/client/types/memotron/node.type";
import type { TypeLocalRecord } from "$lib/client/types/memotron/type.type";
import type { CurationLocalRecord } from "$lib/client/types/memotron/curation.type";
import { AppDexie } from "$lib/client/persistence/dexie";
import type { CollectionLocalRecord } from "$lib/client/types/memotron/collection.type";

export class MemotronDexie extends AppDexie {
  node!: Table<NodeLocalRecord>;
  /**
   * @deprecated - Use `collection` or `combination` instead
   */
  curation!: Table<CurationLocalRecord>;
  /**
   * @deprecated - Use `collection` with type as `type` instead 
   */
  type!: Table<TypeLocalRecord>;

  collection!: Table<CollectionLocalRecord>;

  constructor(scope: string) {
    super(scope);
    this.version(this.dbVersion)
      .stores({
        node: "id, title, children, contentType, createdAt, modifiedAt",
        curation: "id, type, label, createdAt, modifiedAt",
        type: "id, label, createdAt, modifiedAt",
        collection: "id, type, label, createdAt, modifiedAt",
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
