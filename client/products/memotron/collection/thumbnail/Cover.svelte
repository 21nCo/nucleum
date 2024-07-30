<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import type { ICollection } from "../collection.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  export let item: ICollection;
  export let arrangement: Arrangement = Arrangement.LIST;
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

<div class="grow w-full overflow-auto">
  {#if item.cover}
    <img
      src={item.cover}
      alt="collection cover"
      class={cn("h-full w-full object-cover", {
        "rounded-t-md": arrangement === Arrangement.GRID,
        "rounded-md": arrangement === Arrangement.LIST
      })}
    />
  {:else}
    <!-- generate random gradient background -->
    <div
      class={cn("h-full w-full", randomGradient, {
        "rounded-t-md": arrangement === Arrangement.GRID,
        "rounded-md": arrangement === Arrangement.LIST
      })}
    />
  {/if}
</div>
