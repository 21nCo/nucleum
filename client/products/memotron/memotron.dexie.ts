import type { Table } from "dexie";
import type { NodeLocalRecord } from "$lib/client/types/memotron/node.type";
import { AppDexie } from "$lib/client/persistence/dexie";
import type { IPropertyLocalRecord } from "./collection/properties/property.type";
import type {
  ICollection,
  ICollectionView
} from "$lib/client/types/memotron/collection.type";

export class MemotronDexie extends AppDexie {
  node!: Table<NodeLocalRecord>;
  collection!: Table<ICollection>;
  view!: Table<ICollectionView>;
  property!: Table<IPropertyLocalRecord>;

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
