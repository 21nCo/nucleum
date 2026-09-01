import { flux } from "@21n/components/flux/flux";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { PersistenceActionType } from "@21n/types/data.type";
import type { ICollection } from "@21n/components/collection/collection.type";
import { CollectionType } from "@21n/components/collection/collection.type";

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
