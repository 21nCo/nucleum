<script lang="ts">
  import { Arrangement } from "@21n/types/direction.enum";
  import { type ICollectionThumb } from "@21n/components/collection/collection.type";
  import ResourceGridThumbnail from "@21n/components/record/thumbnail/ResourceGridThumbnail.svelte";
  import Cover from "@21n/components/collection/thumbnail/Cover.svelte";
  import { Size } from "@21n/types/size.enum";
  import {
    ResourceAccessPoint,
    ResourceAccessPointState
  } from "@21n/components/flux/resourceStores/resource.type";
  import ResourceThumbnailBase from "@21n/components/record/thumbnail/ResourceThumbnailBase.svelte";
  import CollectionThumbnailLabelRow from "@21n/components/collection/thumbnail/CollectionThumbnailLabelRow.svelte";
  import ResourceThumbnailContentTypeOverlay from "@21n/components/record/thumbnail/ResourceThumbnailContentTypeOverlay.svelte";
  import CollectionPropertyCount from "@21n/components/collection/counts/CollectionPropertyCount.svelte";
  import CollectionNodeCount from "@21n/components/collection/counts/CollectionItemCount.svelte";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import CollectionThumbnailLabel from "@21n/components/collection/thumbnail/CollectionThumbnailLabel.svelte";
  import CollectionThumbnailAvatar from "@21n/components/collection/thumbnail/CollectionThumbnailAvatar.svelte";
  let {
    item = $bindable(),
    arrangement = Arrangement.LIST,
    size = Size.md,
    accessPoint = ResourceAccessPoint.BROWSER,
    accessPointState = ResourceAccessPointState.DEFAULT,
    onClick = undefined
  }: {
    item?: ICollectionThumb;
    arrangement?: Arrangement;
    size?: Size.sm | Size.md;
    accessPoint?: ResourceAccessPoint;
    accessPointState?: ResourceAccessPointState;
    onClick?: ((event: MouseEvent) => void) | undefined;
  } = $props();

  function onCollectionChange(e: any) {
    const data = e.detail?.params?.record;
    if (data && item) {
      item = { ...item, ...data };
    }
  }
</script>

{#if item}
  <ResourceThumbnailBase bind:item {accessPoint} {arrangement}>
  {#if arrangement === Arrangement.LIST}
    <button
      class="flex items-center h-16 gap-3 w-full rounded-md bg-bgs2 border border-transparent hover:border-bgs2 p-3"
      onclick={onClick}
    >
      <CollectionThumbnailAvatar {item} size={Size.lg} />
      <div class="flex flex-col gap-1 flex-grow">
        <div class="flex items-center gap-2 text-b2">
          <CollectionThumbnailLabel
            {item}
            isShowAvatar={false}
            isShowStarStatus={accessPoint !== ResourceAccessPoint.BROWSER}
          />
          <span class="flex gap-1">
            {#if accessPointState === ResourceAccessPointState.DEFAULT}
              <CollectionNodeCount {item} isShowLabel={true} />
            {/if}
            <CollectionPropertyCount {item} isShowLabel={false} />
          </span>
        </div>
        {#if item.description}
          <span class="text-b3 text-fgs3 truncate text-left">
            {item.description}
          </span>
        {/if}
      </div>
    </button>
  {:else if arrangement === Arrangement.GRID || arrangement === Arrangement.MASONRY}
    <ResourceGridThumbnail {item} {size} onclick={onClick}>
      <!-- {#if item.type === CollectionType.TYPED || item.type === CollectionType.QUERY}
        <div
          class="absolute top-0 left-0 flex bg-bgs2 rounded-md px-2 py-1 m-2 text-b3"
        >
          {properCase(item.type)} collection
        </div>
      {/if} -->
      <!-- <ResourceThumbnailContentTypeOverlay contentType={item.type} /> -->
      <Cover {item} {arrangement} />
      {#snippet bottom()}
        <CollectionThumbnailLabelRow item={item!} {arrangement} {accessPoint} />
        <span class="flex gap-2">
          {#if accessPointState === ResourceAccessPointState.DEFAULT}
            <CollectionNodeCount item={item!} isShowLabel={true} />
          {/if}
          <CollectionPropertyCount item={item!} isShowLabel={size === Size.md} />
        </span>
      {/snippet}
    </ResourceGridThumbnail>
  {/if}
  </ResourceThumbnailBase>

  <ComponentBaseLayer
    subscribeToRecords={[item.id]}
    onChange={onCollectionChange}
  />
{/if}
