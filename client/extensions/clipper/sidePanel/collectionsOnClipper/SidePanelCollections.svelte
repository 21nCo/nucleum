<script lang="ts">
  import { extensionFlux } from "$lib/client/components/flux/fluxExtentionMediator";
  import { FluxMethod } from "$lib/client/components/flux/flux.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { CollectionType } from "$lib/client/components/collection/collection.type";
  import type { ICollection } from "$lib/client/components/collection/collection.type";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import CollectionsList from "./CollectionsList.svelte";
  import CollectionItemsView from "./CollectionItemsView.svelte";
  import type { CollectionData, CollectionItem } from "./types";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";

  let collections: CollectionData[] = [];
  let selectedCollection: CollectionData | null = null;
  let collectionItems: CollectionItem[] = [];
  let isLoading = true;
  let isLoadingItems = false;
  let error: string | undefined = undefined;

  async function loadCollections() {
    try {
      isLoading = true;
      error = undefined;

      const allLinks = await extensionFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: Resource.link,
          params: {}
        }
      });

      const collectionLinks = (allLinks || []).filter((link: any) => {
        return link.out && link.out.toString().includes("collection:");
      });

      const collectionIds = [
        ...new Set(collectionLinks.map((link: any) => link.out.toString()))
      ] as string[];

      const collectionsData =
        collectionIds.length > 0
          ? await extensionFlux({
              method: FluxMethod.SELECT_MANY,
              args: {
                resource: Resource.collection,
                params: {
                  filters: {
                    id: collectionIds
                  }
                }
              }
            })
          : [];

      const webpageNodeIds = await getWebpageNodeIds(collectionLinks);

      const collectionsWithCounts = (collectionsData || [])
        .filter(activeResourceFilter)
        .map((collection: ICollection) => {
          const itemCount = webpageNodeIds.filter((nodeId) =>
            collectionLinks.some(
              (link: any) =>
                link.out.toString() === collection.id.toString() &&
                link.in.toString() === nodeId
            )
          ).length;

          return {
            id: collection.id.toString(),
            label: collection.label || "Untitled Collection",
            avatar: collection.avatar,
            type: collection.type || CollectionType.UNTYPED,
            itemCount
          };
        })
        .filter((collection: CollectionData) => collection.itemCount > 0);

      collections = collectionsWithCounts;
    } catch (err) {
      console.error("Error loading collections:", err);
      error = "Failed to load collections";
    } finally {
      isLoading = false;
    }
  }

  async function getWebpageNodeIds(collectionLinks: any[]): Promise<string[]> {
    const nodeIds = [
      ...new Set(collectionLinks.map((link: any) => link.in.toString()))
    ];

    if (nodeIds.length === 0) return [];

    const nodes = await extensionFlux({
      method: FluxMethod.SELECT_MANY,
      args: {
        resource: Resource.node,
        params: {
          filters: {
            id: nodeIds,
            contentType: [NodeType.WEB_PAGE]
          }
        }
      }
    });

    return (nodes || []).map((node: any) => node.id.toString());
  }

  async function loadCollectionItems(collection: CollectionData) {
    try {
      isLoadingItems = true;
      selectedCollection = collection;

      const allLinks = await extensionFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: Resource.link,
          params: {
            filters: {
              out: collection.id
            }
          }
        }
      });

      const nodeIds = (allLinks || []).map((link: any) => link.in.toString());

      if (nodeIds.length === 0) {
        collectionItems = [];
        return;
      }

      const nodes = await extensionFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: Resource.node,
          params: {
            filters: {
              id: nodeIds,
              contentType: [NodeType.WEB_PAGE]
            }
          }
        }
      });

      collectionItems = (nodes || []).map((node: any) => ({
        id: node.id.toString(),
        label: node.label || "Untitled",
        url: node.url,
        metadata: node.metadata
      }));
    } catch (err) {
      console.error("Error loading collection items:", err);
      collectionItems = [];
    } finally {
      isLoadingItems = false;
    }
  }

  function handleCollectionClick(event: CustomEvent<CollectionData>) {
    loadCollectionItems(event.detail);
  }

  function handleBackClick() {
    selectedCollection = null;
    collectionItems = [];
  }
</script>

<div class="flex flex-col w-full h-full bg-bgs1">
  {#await loadCollections()}
    <EmptyStatusView isLoadingState={true} />
  {:then}
    {#if selectedCollection}
      <CollectionItemsView
        {selectedCollection}
        {collectionItems}
        {isLoadingItems}
        on:back={handleBackClick}
      />
      <div class="p-4 border-b border-bgs3 bg-bgs2">
        <div class="text-fgs3 text-b3 text-center">
          Click to open the web page in the current tab.
          <div>Cmd + click to open in new tab</div>
        </div>
      </div>
    {:else}
      <CollectionsList
        {collections}
        {isLoading}
        {error}
        on:collectionClick={handleCollectionClick}
      />
    {/if}
  {/await}
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
