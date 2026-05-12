<svelte:options runes={true} />

<script lang="ts">
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { linker } from "@21n/products/memotron/linking/link.store";
  import { LinkType } from "@21n/products/memotron/linking/link.type";
  import { collectionStore } from "@21n/components/collection/collection.store";
  import { cache } from "@21n/layout/layers/cache/cache.store";
  import { logger } from "@21n/components/debug/logger.client";
  import { onMount } from "svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { CacheKey } from "@21n/layout/layers/cache/cache.type";
  import {
    CollectionObjectKey,
    CollectionType,
    type ICollection
  } from "@21n/components/collection/collection.type";
  import ResourceCache from "@21n/components/record/ResourceCache.svelte";
  import { resourceCacheKey } from "@21n/components/flux/resourceStores/resource.utils";

  onMount(async () => {
    await refresh();
  });

  async function refresh() {
    await refreshCollectionItemCounts();
    await refreshTypedCollections();
  }

  async function refreshCollectionItemCounts() {
    try {
      const collections = await collectionStore.selectMany({
        properties: {
          select: ["id"]
        }
      });
      let links = await linker.selectMany({
        properties: {
          select: ["out"],
          expand: ["in"]
        },
        filters: {
          linkType: LinkType.DIRECT,
          out: collections.map((x: ICollection) => x.id.toString())
        }
      });
      if (links && Array.isArray(links)) {
        links = links.filter((x: any) => {
          return x && x.in && !x.in.isArchived && !x.in.trashInformation;
        });
        const counts = links
          .map((x: any) => ({ ...x, out: x.out.toString() }))
          .reduce((acc: Record<string, number>, x: any) => {
            acc[x.out] = (acc[x.out] || 0) + 1;
            return acc;
          }, {});
        cache.replace(
          resourceCacheKey(Resource.collection, CacheKey.ITEM_COUNTS),
          counts
        );
      }
    } catch (error) {
      logger.error(error);
      return {};
    }
  }

  async function refreshTypedCollections() {
    const collections = await collectionStore.selectMany(
      {
        properties: {
          select: ["id", "avatar"],
          expand: [CollectionObjectKey.typeToExtend]
        },
        filters: {
          type: CollectionType.TYPED
        }
      },
      {
        isQueryAsIs: true
      }
    );
    cache.replace(CacheKey.TYPED_COLLECTION_CACHE, collections);
  }
</script>

<ResourceCache resource={Resource.collection} />
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.collection, Resource.link])}
  onChange={refresh}
  onSyncDown={refresh}
/>
