<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { type ICollectionThumb } from "$lib/client/components/collection/collection.type";
  import ResourceGridThumbnail from "$lib/client/components/record/thumbnail/ResourceGridThumbnail.svelte";
  import Cover from "./Cover.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import {
    ResourceAccessPoint,
    ResourceAccessPointState
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import ResourceThumbnailBase from "$lib/client/components/record/thumbnail/ResourceThumbnailBase.svelte";
  import CollectionThumbnailLabelRow from "./CollectionThumbnailLabelRow.svelte";
  import ResourceThumbnailContentTypeOverlay from "$lib/client/components/record/thumbnail/ResourceThumbnailContentTypeOverlay.svelte";
  import CollectionPropertyCount from "../counts/CollectionPropertyCount.svelte";
  import CollectionNodeCount from "../counts/CollectionItemCount.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import CollectionThumbnailLabel from "./CollectionThumbnailLabel.svelte";
  import CollectionThumbnailAvatar from "./CollectionThumbnailAvatar.svelte";
  export let item: ICollectionThumb;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointState: ResourceAccessPointState =
    ResourceAccessPointState.DEFAULT;

  function onCollectionChange(e: any) {
    const data = e.detail?.params?.record;
    if (data) {
      item = { ...item, ...data };
    }
  }
</script>

<ResourceThumbnailBase bind:item {accessPoint} {arrangement}>
  {#if arrangement === Arrangement.LIST}
    <button
      class="flex items-center h-16 gap-3 w-full rounded-md bg-bgs2 border border-transparent hover:border-bgs2 p-3"
      on:click
    >
      <CollectionThumbnailAvatar {item} size={Size.lg} />
      <div class="flex flex-col gap-1 flex-grow">
        <CollectionThumbnailLabel
          {item}
          isShowAvatar={false}
          isShowStarStatus={accessPoint !== ResourceAccessPoint.BROWSER}
        />
        {#if item.description}
          <span class="text-b3 text-fgs3 truncate text-left">
            {item.description}
          </span>
        {/if}
      </div>
    </button>
  {:else if arrangement === Arrangement.GRID || arrangement === Arrangement.MASONRY}
    <ResourceGridThumbnail {item} {size} on:click>
      <!-- {#if item.type === CollectionType.TYPED || item.type === CollectionType.QUERY}
        <div
          class="absolute top-0 left-0 flex bg-bgs2 rounded-md px-2 py-1 m-2 text-b3"
        >
          {properCase(item.type)} collection
        </div>
      {/if} -->
      <!-- <ResourceThumbnailContentTypeOverlay contentType={item.type} /> -->
      <Cover {item} {arrangement} />
      <slot slot="bottom" name="bottom">
        <CollectionThumbnailLabelRow {item} {arrangement} {accessPoint} />
        <span class="flex gap-2">
          {#if accessPointState === ResourceAccessPointState.DEFAULT}
            <CollectionNodeCount {item} isShowLabel={true} />
          {/if}
          <CollectionPropertyCount {item} />
        </span>
      </slot>
    </ResourceGridThumbnail>
  {/if}
</ResourceThumbnailBase>

<ComponentBaseLayer
  subscribeToRecords={[item.id]}
  on:change={onCollectionChange}
/>
