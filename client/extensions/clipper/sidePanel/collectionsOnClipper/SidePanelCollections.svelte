<script lang="ts">
  import { extensionFlux } from "$lib/client/components/flux/fluxExtentionMediator";
  import { FluxMethod } from "$lib/client/components/flux/flux.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import {
    CollectionLayout,
    CollectionType
  } from "$lib/client/components/collection/collection.type";
  import type { ICollection } from "$lib/client/components/collection/collection.type";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import CollectionsList from "./CollectionsList.svelte";
  import CollectionItemsView from "./CollectionItemsView.svelte";
  import type { CollectionData, CollectionItem } from "./types";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import NewCollectionWizard from "./NewCollectionWizard.svelte";
  import { collectionStore } from "$lib/client/components/collection/collection.store";

  export let currentUrl: string;

  let collections: CollectionData[] = [];
  let selectedCollection: CollectionData | null = null;
  let collectionItems: CollectionItem[] = [];
  let isLoading = true;
  let isLoadingItems = false;
  let error: string | undefined = undefined;
  let isHideEmptyCollections = true;
  let isShowNewCollectionWizard = false;
  let newCollectionLabel: string | undefined = undefined;

  const webContentTypes = [
    NodeType.WEB_PAGE,
    NodeType.YOUTUBE_VIDEO,
    NodeType.YOUTUBE_CHANNEL,
    NodeType.TWEET,
    NodeType.TWITTER_PROFILE,
    NodeType.REDDIT_THREAD,
    NodeType.DISCORD_THREAD,
    NodeType.TED_VIDEO,
    NodeType.INSTAGRAM_POST,
    NodeType.FACEBOOK_POST,
    NodeType.TWITCH_STREAM,
    NodeType.STACKOVERFLOW_THREAD,
    NodeType.GITHUB_REPO,
    NodeType.GITHUB_PROFILE,
    NodeType.GITHUB_DISCUSSION,
    NodeType.GITLAB_PROJECT,
    NodeType.GIST
  ];

  async function loadCollections() {
    try {
      isLoading = true;
      error = undefined;

      const allCollections = await extensionFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: Resource.collection,
          params: {}
        }
      });

      const allLinks = await extensionFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: Resource.link,
          params: {}
        }
      });

      const collectionsWithCounts = await Promise.all(
        (allCollections || [])
          .filter(activeResourceFilter)
          .map(async (collection: ICollection) => {
            const collectionLinks = (allLinks || []).filter(
              (link: any) =>
                link.out && link.out.toString() === collection.id.toString()
            );

            const webContentNodeIds =
              await getWebContentNodeIds(collectionLinks);

            return {
              id: collection.id.toString(),
              label: collection.label || "Untitled Collection",
              avatar: collection.avatar,
              type: collection.type || CollectionType.UNTYPED,
              itemCount: webContentNodeIds.length
            };
          })
      );

      collections = isHideEmptyCollections
        ? collectionsWithCounts.filter(
            (collection: CollectionData) => collection.itemCount > 0
          )
        : collectionsWithCounts;
    } catch (err) {
      console.error("Error loading collections:", err);
      error = "Failed to load collections";
    } finally {
      isLoading = false;
    }
  }

  async function getWebContentNodeIds(
    collectionLinks: any[]
  ): Promise<string[]> {
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
            contentType: webContentTypes
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
              contentType: webContentTypes
            }
          }
        }
      });

      const sortedNodes = (nodes || []).sort((a: any, b: any) => {
        const aModified = new Date(a.modifiedAt || a.createdAt).getTime();
        const bModified = new Date(b.modifiedAt || b.createdAt).getTime();
        return bModified - aModified;
      });

      collectionItems = sortedNodes.map((node: any) => ({
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

  function handleHideEmptyToggle(event: CustomEvent<boolean>) {
    isHideEmptyCollections = event.detail;
    loadCollections();
  }

  async function handleNewCollectionSave(event: CustomEvent<string>) {
    newCollectionLabel = event.detail;
    const result = await collectionStore.save({
      label: newCollectionLabel,
      type: CollectionType.UNTYPED,
      defaultLayout: CollectionLayout.BOARD,
      resource: Resource.node
    });
    if (result) {
      isHideEmptyCollections = false;
      await loadCollections();
    }
    newCollectionLabel = undefined;
    isShowNewCollectionWizard = false;
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
        {currentUrl}
        on:back={handleBackClick}
      />
      <div class="p-4 border-b border-bgs3 bg-bgs2">
        <div class="text-fgs3 text-b3 text-center">
          Click to open the web page in the current tab.
          <div>Cmd + click to open in new tab</div>
        </div>
      </div>
    {:else}
      <div
        class="h-16 min-h-16 flex items-center justify-center border-b border-bgs3 bg-bgs2"
      >
        <div class="flex items-center justify-between w-full px-2">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-fgs1 text-b2 font-medium">Collections</h2>
              <Badge text="beta" />
            </div>
            <p class="text-fgs3 text-b3">
              Collections that has web page nodes.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Toggle
              icon={isShowNewCollectionWizard ? "ph:x-light" : "ph:plus-light"}
              parentBgIndex={2}
              bgSize={Size.sm}
              tooltip={isShowNewCollectionWizard
                ? "Cancel"
                : "Create new collection"}
              bind:on={isShowNewCollectionWizard}
            />
            <Toggle
              icon="ph:eye-slash-light"
              parentBgIndex={2}
              bgSize={Size.sm}
              tooltip={isHideEmptyCollections ? "Show empty" : "Hide empty"}
              on={isHideEmptyCollections}
              on:change={handleHideEmptyToggle}
            />
          </div>
        </div>
      </div>
      {#if isShowNewCollectionWizard}
        <NewCollectionWizard
          bind:label={newCollectionLabel}
          on:save={handleNewCollectionSave}
        />
      {/if}
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
