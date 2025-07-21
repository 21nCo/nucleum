import { flux } from "$lib/client/components/flux/flux";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { PersistenceActionType } from "$lib/client/types/data.type";
import type { ICollection } from "./collection/collection.type";
import { CollectionType } from "./collection/collection.type";

export async function defaultsMigrationTidy() {
  await defaultsMigrationForCollections();
}

async function defaultsMigrationForCollections() {
  const collections = await flux.selectMany(Resource.collection);
  const collectionsWithoutType = collections.filter(
    (x: ICollection) => !x.type
  );
  console.log({
    at: "defaultsMigrationForCollections",
    collectionsWithoutType
  });
  if (collectionsWithoutType.length) {
    await flux.mutation<ICollection>(Resource.collection, {
      action: PersistenceActionType.BULK_MERGE,
      recordIds: collectionsWithoutType.map((x: ICollection) => x.id),
      changes: {
        type: CollectionType.UNTYPED
      }
    });
  }
  const collectionsWithoutTypeToExtend = collections.filter(
    (x: ICollection) => !x.typeToExtend && x.typeToExtend !== ""
  );
  console.log({
    at: "defaultsMigrationForCollections",
    collectionsWithoutTypeToExtend
  });
  if (collectionsWithoutTypeToExtend.length) {
    await flux.mutation<ICollection>(Resource.collection, {
      action: PersistenceActionType.BULK_MERGE,
      recordIds: collectionsWithoutTypeToExtend.map((x: ICollection) => x.id),
      changes: {
        typeToExtend: ""
      }
    });
  }
}
