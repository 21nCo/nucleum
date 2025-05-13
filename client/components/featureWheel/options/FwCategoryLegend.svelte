<script lang="ts">
  import type { IFwCategory } from "$lib/client/types/featureWheel.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  export let categories: IFwCategory[] = [];
  export let selectedCategories: string[] = [];
  export let isHorizontal: boolean = false;
  const dispatch = createEventDispatcher();
</script>

<div class="w-full h-full flex flex-col gap-3">
  <div class="text-b2 text-fgs3">Categories</div>

  <div
    class={cn("gap-x-6 gap-y-3", {
      "flex flex-wrap": isHorizontal,
      "grid grid-cols-2 2k:grid-cols-3": !isHorizontal
    })}
  >
    {#each categories as category}
      <button
        class={cn("flex items-center gap-3 p-1 rounded-md", {
          "bg-bgs3": selectedCategories.includes(category.label)
        })}
        on:click={() => {
          dispatch("categoryClick", category);
        }}
      >
        <div
          class="w-4 h-4 rounded-full"
          style="background-color: {category.color || '#888'}"
        ></div>
        <span class="text-sm">{category.label}</span>
      </button>
    {/each}

    {#if categories.length === 0}
      <div class="text-sm text-gray-400 italic">No categories available</div>
    {/if}
  </div>
</div>
