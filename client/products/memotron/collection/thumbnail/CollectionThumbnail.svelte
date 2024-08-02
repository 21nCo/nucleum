<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import {
    CollectionType,
    type ICollection
  } from "$lib/client/products/memotron/collection/collection.type";
  import ResourceGridThumbnail from "../../common/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailTitle from "../../common/thumbnail/ResourceThumbnailTitle.svelte";
  import Counts from "./Counts.svelte";
  import Cover from "./Cover.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ResourceAccessPoint } from "$lib/client/components/resourceStores/resource.type";
  import ResourceThumbnailBase from "../../common/thumbnail/ResourceThumbnailBase.svelte";
  import { properCase } from "$lib/shared/utils/text.utils";
  export let item: ICollection;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
</script>

<ResourceThumbnailBase bind:item {accessPoint}>
  {#if arrangement === Arrangement.LIST}
    <button
      class="flex h-20 gap-4 w-full rounded-md bg-bgs2 border border-transparent hover:border-aps2 p-3"
      on:click
    >
      <div class="flex h-full w-14">
        <Cover {item} {arrangement} />
      </div>
      <div class="flex flex-col gap-2 grow">
        <ResourceThumbnailTitle {item} />
        <Counts {item} />
      </div>
    </button>
  {:else if arrangement === Arrangement.GRID}
    <ResourceGridThumbnail {item} {size} on:click>
      {#if item.type === CollectionType.TYPED || item.type === CollectionType.QUERY}
        <div
          class="absolute top-0 left-0 flex bg-bgs2 rounded-md px-2 py-1 m-2 text-b3"
        >
          {properCase(item.type)} collection
        </div>
      {/if}
      <Cover {item} {arrangement} />
      <slot slot="bottom" name="bottom">
        <Counts {item} />
      </slot>
    </ResourceGridThumbnail>
  {/if}
</ResourceThumbnailBase>
