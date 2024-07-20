import type { Table } from "dexie";
import type { INode } from "$lib/client/products/memotron/node/node.type";
import { AppDexie } from "$lib/client/persistence/dexie";
import type {
  ICollection,
  ICollectionView
} from "$lib/client/products/memotron/collection/collection.type";
import type { IProperty } from "./collection/properties/property.type";

export class MemotronDexie extends AppDexie {
  node!: Table<INode>;
  collection!: Table<ICollection>;
  view!: Table<ICollectionView>;
  property!: Table<IProperty>;

  constructor(scope: string) {
    super(scope);
    this.version(this.dbVersion)
      .stores({
        node: "id, title, children, contentType, createdAt, modifiedAt",
        type: "id, label, createdAt, modifiedAt",
        collection:
          "id, type, label, type, isStarred, isCaptureShortcutEnabled, createdAt, modifiedAt",
        property: "id, label, createdAt, modifiedAt",
        view: "id, label, createdAt, modifiedAt"
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
