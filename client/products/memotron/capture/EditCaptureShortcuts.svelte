<script lang="ts">
  import { collectionStore } from "$lib/client/components/collection/collection.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import type { ICollectionThumb } from "$lib/client/components/collection/collection.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Switch from "$lib/client/elements/toggle/Switch.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import CollectionThumbnailLabel from "$lib/client/components/collection/thumbnail/CollectionThumbnailLabel.svelte";
  import InlineSearchBar from "$lib/client/elements/InlineSearchBar.svelte";
  import { InputStyle } from "$lib/client/types/input.type";

  let collections: ICollectionThumb[] = [];
  let filteredCollections: ICollectionThumb[] = [];
  let query: string = "";
  async function loadCollections() {
    const data = await collectionStore.selectMany(
      {
        filters: {
          resource: Resource.node
        }
      },
      {
        isExpand: true
      }
    );
    collections = data || [];
    filteredCollections = collections;
  }

  async function toggleShortcut(collectionId: string, isEnabled: boolean) {
    try {
      await collectionStore.modify(collectionId, {
        isCaptureShortcutEnabled: isEnabled
      });
      collections = collections.map((collection) =>
        collection.id === collectionId
          ? { ...collection, isCaptureShortcutEnabled: isEnabled }
          : collection
      );
      filteredCollections = filteredCollections.map((collection) =>
        collection.id === collectionId
          ? { ...collection, isCaptureShortcutEnabled: isEnabled }
          : collection
      );
    } catch (error) {
      console.error("Error updating capture shortcut:", error);
    }
  }

  function onSearch(event: CustomEvent<string>) {
    query = event.detail;
    if (query) {
      filteredCollections = collections.filter(
        (collection) =>
          collection.label?.toLowerCase().includes(query.toLowerCase()) ?? false
      );
    } else {
      filteredCollections = collections;
    }
  }
</script>

<div class="flex flex-col gap-8 w-full h-full overflow-y-auto">
  {#await loadCollections()}
    <div class="w-full pt-8">
      <EmptyStatusView isLoadingState={true} />
    </div>
  {:then}
    <div class="text-b2 text-fgs3">
      Enable collections to appear as quick capture options in the capture
      screen.
    </div>
    <div class="flex flex-col gap-2 w-full flex-grow">
      {#if collections.length === 0}
        <EmptyStatusView
          mainText="No collections found. Please create a new collection."
          actionText="Create new collection"
          on:click={() => {
            appStore.runAction(
              resourceAction(Resource.collection, ResourceActionType.CREATE)
            );
          }}
        />
      {:else}
        <InlineSearchBar
          bind:query
          on:search={onSearch}
          style={InputStyle.FILLED}
        />
        {#each filteredCollections as collection (collection.id)}
          <div
            class="flex justify-between items-center p-3 rounded-lg bg-bgs2 border border-brs3 w-full"
          >
            <div class="flex flex-col">
              <CollectionThumbnailLabel
                item={collection}
                isShowStarStatus={false}
              />
            </div>
            <Switch
              bind:on={collection.isCaptureShortcutEnabled}
              on:change={(e) => toggleShortcut(collection.id, e.detail)}
            />
          </div>
        {/each}
        <ScrollViewBottomSpacer />
      {/if}
    </div>
  {:catch}
    <EmptyStatusView mainText="Error loading collections" />
  {/await}
</div>
