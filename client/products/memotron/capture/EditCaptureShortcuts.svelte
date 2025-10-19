<script lang="ts">
  import { collectionStore } from "@21n/components/collection/collection.store";
  import { CollectionType } from "@21n/components/collection/collection.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import type { ICollectionThumb } from "@21n/components/collection/collection.type";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import Switch from "@21n/elements/toggle/Switch.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { resourceAction } from "@21n/components/flux/resourceStores/resource.utils";
  import { ResourceActionType } from "@21n/components/flux/resourceStores/resource.type";
  import Button from "@21n/elements/button/Button.svelte";
  import modalEvent from "@21n/components/modal/modal.store";
  import { MemotronAction } from "@21n/products/memotron/memotronAction.enum";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import view from "@21n/stores/view.store";
  import { resolveProductConfig } from "@21n/products/product.config";
  import CollectionThumbnailLabel from "@21n/components/collection/thumbnail/CollectionThumbnailLabel.svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";

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
              if ($view.isPortrait) {
                appStore.runAction(ResourceActionType.BROWSE, {
                  componentParams: {
                    resource: Resource.collection,
                    [AppSearchParam.RETURN_TO]:
                      resolveProductConfig().homePathPt
                  }
                });
              } else {
                appStore.runAction(
                  resourceAction(Resource.collection, ResourceActionType.BROWSE)
                );
              }
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
