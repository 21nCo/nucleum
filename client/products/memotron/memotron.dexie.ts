import type { Table } from "dexie";
import type { INode } from "$lib/client/products/memotron/node/node.type";
import { AppDexie } from "$lib/client/persistence/dexie";
import type {
  ICollection,
  ICollectionView
} from "$lib/client/components/collection/collection.type";
import type { IProperty } from "$lib/client/components/collection/properties/property.type";
import type { IFile } from "$lib/client/components/files/file.type";
import type {
  ILink,
  ILinkTag
} from "$lib/client/products/memotron/linking/link.type";

const memoryStores = {
  node: "id, title, children, contentType, createdAt, modifiedAt, interactedAt, text",
  collection:
    "id, type, resource, label, isStarred, isCaptureShortcutEnabled, createdAt, modifiedAt, interactedAt",
  property: "id, label, createdAt, modifiedAt, interactedAt",
  view: "id, label, createdAt, modifiedAt, interactedAt",
  file: "id, label, type, size, createdAt",
  link: "id, in, out, linkType, tags",
  linkTag: "id, group, label"
};

export class MemotronDexie extends AppDexie {
  node!: Table<INode>;
  collection!: Table<ICollection>;
  view!: Table<ICollectionView>;
  property!: Table<IProperty>;
  file!: Table<IFile>;
  link!: Table<ILink>;
  linkTag!: Table<ILinkTag>;

  constructor(scope: string) {
    super(scope);
    this.version(this.dbVersion)
      .stores(memoryStores)
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
