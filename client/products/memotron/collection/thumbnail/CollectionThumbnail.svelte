<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import {
    CollectionType,
    type ICollection
  } from "$lib/client/products/memotron/collection/collection.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import CountBadge from "./CountBadge.svelte";
  import ResourceGridThumbnail from "../../common/thumbnail/ResourceGridThumbnail.svelte";
  export let item: ICollection;
  export let arrangement: Arrangement = Arrangement.LIST;
  console.log({ item });
  let randomGradient: string;
  // TODO - generate random gradient at the creation of the collection and keep the same gradient for the lifetime of the collection
  const gradientColors = [
    "bg-gradient-to-r from-violet-400 to-purple-300",
    "bg-gradient-to-r from-indigo-400 to-cyan-400",
    "bg-gradient-to-tr from-violet-500 to-orange-300",
    "bg-gradient-to-r from-teal-400 to-gray-800",
    "bg-gradient-to-r from-amber-200 to-yellow-500",
    "bg-gradient-to-b from-gray-900 to-gray-600",
    "bg-gradient-to-br from-fuchsia-600 via-fuchsia-400 to-fuchsia-200",
    "bg-gradient-to-tr from-pink-600 via-pink-400 to-pink-200",
    "bg-gradient-to-bl from-red-800 via-red-600 to-red-400",
    "bg-gradient-to-b from-green-600 via-green-400 to-green-200"
  ];

  function getRandomGradient() {
    return gradientColors[Math.floor(Math.random() * gradientColors.length)];
  }

  onMount(() => {
    randomGradient = getRandomGradient();
  });
</script>

{#if arrangement === Arrangement.LIST}
  <!-- content here -->
{:else if arrangement === Arrangement.GRID}
  <ResourceGridThumbnail {item} on:click>
    <div class="grow w-full">
      {#if item.cover}
        <img
          src={item.cover}
          alt="collection cover"
          class={cn("h-full w-full object-cover", {})}
        />
      {:else}
        <!-- generate random gradient background -->
        <div class={cn("h-full w-full rounded-t-md", randomGradient)} />
      {/if}
    </div>
    <slot slot="bottom" name="bottom">
      <div class="flex gap-2">
        <CountBadge count={10} label="nodes" />
        {#if item.type === CollectionType.TYPED}
          <CountBadge count={item.properties?.length} label="properties" />
        {/if}
      </div>
    </slot>
  </ResourceGridThumbnail>
{/if}
