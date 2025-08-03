<script lang="ts">
  import { collectionStore } from "$lib/client/components/collection/collection.store";
  import { CollectionType } from "$lib/client/components/collection/collection.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import type { ICollection } from "$lib/client/components/collection/collection.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Switch from "$lib/client/elements/toggle/Switch.svelte";

  let collections: ICollection[] = [];

  async function loadCollections() {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const data = await collectionStore.selectMany({
      filters: {
        type: CollectionType.TYPED,
        resource: Resource.node
      }
    });
    collections = data || [];
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
    } catch (error) {
      console.error("Error updating capture shortcut:", error);
    }
  }
</script>

<div class="flex flex-col gap-4 w-full h-full">
  {#await loadCollections()}
    <EmptyStatusView isLoadingState={true} />
  {:then}
    <div class="text-b2 text-fgs3 mb-4">
      Enable collections to appear as quick capture options in the capture
      screen.
    </div>
    <div class="flex flex-col gap-2 w-full">
      {#each collections as collection}
        <div
          class="flex justify-between items-center p-3 rounded-lg bg-bgs2 border border-brs3 w-full"
        >
          <div class="flex flex-col">
            <span class="text-b1 text-fgs1">{collection.label}</span>
          </div>
          <Switch
            bind:on={collection.isCaptureShortcutEnabled}
            on:change={(e) => toggleShortcut(collection.id, e.detail)}
          />
        </div>
      {/each}
    </div>
  {:catch}
    <EmptyStatusView mainText="Error loading collections" />
  {/await}
</div>
