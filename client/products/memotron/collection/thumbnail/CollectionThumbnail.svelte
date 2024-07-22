<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import type { ICollection } from "$lib/client/products/memotron/collection/collection.type";
  import ResourceGridThumbnail from "../../common/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailTitle from "../../common/thumbnail/ResourceThumbnailTitle.svelte";
  import Counts from "./Counts.svelte";
  import Cover from "./Cover.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ResourceAccessPoint } from "$lib/client/components/resourceStores/resource.type";
  import ResourceThumbnailBase from "../../common/thumbnail/ResourceThumbnailBase.svelte";
  export let item: ICollection;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md = Size.md;
  export let context: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  console.log({ item });
</script>

<ResourceThumbnailBase bind:item {context}>
  {#if arrangement === Arrangement.LIST}
    <button
      class="flex gap-4 w-full rounded-md bg-bgs2 border border-transparent hover:border-aps2 p-3"
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
      <Cover {item} {arrangement} />
      <slot slot="bottom" name="bottom">
        <Counts {item} />
      </slot>
    </ResourceGridThumbnail>
  {/if}
</ResourceThumbnailBase>
