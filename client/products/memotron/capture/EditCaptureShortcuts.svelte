<script lang="ts">
  import { collectionStore } from "$lib/client/components/collection/collection.store";
  import { CollectionType } from "$lib/client/components/collection/collection.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import type { ICollectionThumb } from "$lib/client/components/collection/collection.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Switch from "$lib/client/elements/toggle/Switch.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { MemotronAction } from "../memotronAction.enum";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import view from "$lib/client/stores/view.store";
  import { resolveProductConfig } from "../../product.config";
  import CollectionThumbnailLabel from "$lib/client/components/collection/thumbnail/CollectionThumbnailLabel.svelte";

  let collections: ICollectionThumb[] = [];

  async function loadCollections() {
    const data = await collectionStore.selectMany(
      {
        filters: {
          type: CollectionType.TYPED,
          resource: Resource.node
        }
      },
      {
        isExpand: true
      }
    );
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

<div class="flex flex-col gap-8 w-full h-full overflow-y-auto">
  {#await loadCollections()}
    <div class="w-full pt-8">
      <EmptyStatusView isLoadingState={true} />
    </div>
  {:then}
    <div class="text-b2 text-fgs3">
      Enable typed collections to appear as quick capture options in the capture
      screen.
    </div>
    <div class="flex flex-col gap-2 w-full flex-grow">
      {#if collections.length === 0}
        <EmptyStatusView
          mainText="No typed collections found. Please create a new collection."
          actionText="Create new collection"
          on:click={() => {
            appStore.runAction(
              resourceAction(Resource.collection, ResourceActionType.CREATE)
            );
          }}
        />
      {:else}
        {#each collections as collection (collection.id)}
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
        <div class="flex justify-center w-full pt-2">
          <Button
            label="See all collections"
            style={ButtonStyle.PLAIN}
            isUnderlined={true}
            on:click={() => {
              modalEvent.hide(MemotronAction.EDIT_CAPTURE_SHORTCUTS);
              modalEvent.hide(MemotronAction.CAPTURE_SETTINGS);
              appStore.runAction(
                resourceAction(Resource.collection, ResourceActionType.BROWSE),
                {
                  searchParams: $view.isPortrait
                    ? {
                        back: resolveProductConfig().homePathPt
                      }
                    : undefined
                }
              );
            }}
          />
        </div>
        <ScrollViewBottomSpacer />
      {/if}
    </div>
  {:catch}
    <EmptyStatusView mainText="Error loading collections" />
  {/await}
</div>
