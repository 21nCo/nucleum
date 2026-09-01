<svelte:options runes={true} />

<script lang="ts">
  import { cache } from "@21n/layout/layers/cache/cache.store";
  import { onMount } from "svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { CacheKey } from "@21n/layout/layers/cache/cache.type";
  import { CollectionType } from "@21n/components/collection/collection.type";
  import { resourceCacheKey } from "@21n/components/flux/resourceStores/resource.utils";
  import { datafn } from "@21n/stores/datafn.store";

  onMount(() => {
    let disposeSignals = () => {};
    const unsubscribeClient = datafn.subscribeClient(() => {
      disposeSignals();
      const collectionIdsSignal = datafn.collection.signal({
        select: ["id"]
      });
      const typedCollectionsSignal = datafn.collection.signal({
        select: ["id", "avatar", "typeToExtend.*"],
        filters: { type: CollectionType.TYPED }
      });
      let disposeCountsSignal = () => {};
      const unsubscribeCollectionIds = collectionIdsSignal.subscribe(
        (collections) => {
          disposeCountsSignal();
          const ids = collections.flatMap((collection) =>
            typeof collection.id === "string" ? [collection.id] : []
          );
          const countsSignal = datafn.relationCountsSignal({
            resource: "collection",
            relation: "items",
            ids,
            targetFilters: { isArchived: false, trashedAt: null }
          });
          const unsubscribeCounts = countsSignal.subscribe((counts) => {
            cache.replace(
              resourceCacheKey(Resource.collection, CacheKey.ITEM_COUNTS),
              counts
            );
          });
          disposeCountsSignal = () => {
            unsubscribeCounts();
            countsSignal.dispose();
          };
        }
      );
      const unsubscribeTypedCollections = typedCollectionsSignal.subscribe(
        (collections) => {
          cache.replace(CacheKey.TYPED_COLLECTION_CACHE, collections);
        }
      );
      disposeSignals = () => {
        disposeCountsSignal();
        unsubscribeCollectionIds();
        unsubscribeTypedCollections();
        collectionIdsSignal.dispose();
        typedCollectionsSignal.dispose();
      };
    });
    return () => {
      unsubscribeClient();
      disposeSignals();
    };
  });
</script>
