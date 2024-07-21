<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import type { ICollection } from "$lib/client/products/memotron/collection/collection.type";
  import ResourceGridThumbnail from "../../common/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailTitle from "../../common/thumbnail/ResourceThumbnailTitle.svelte";
  import Counts from "./Counts.svelte";
  import Cover from "./Cover.svelte";
  export let item: ICollection;
  export let arrangement: Arrangement = Arrangement.LIST;
  console.log({ item });
</script>

{#if arrangement === Arrangement.LIST}
  <button
    class="flex gap-4 w-full rounded-md bg-bgs2 border border-transparent hover:border-aps2 p-3"
    on:click
  >
    <div class="flex h-full w-14">
      <Cover {item} {arrangement} />
    </div>
    <div class="flex flex-col gap-2">
      <ResourceThumbnailTitle {item} />
      <Counts {item} />
    </div>
  </button>
{:else if arrangement === Arrangement.GRID}
  <ResourceGridThumbnail {item} on:click>
    <Cover {item} {arrangement} />
    <slot slot="bottom" name="bottom">
      <Counts {item} />
    </slot>
  </ResourceGridThumbnail>
{/if}
