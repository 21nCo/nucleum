<script lang="ts">
  import type { IFwCategory } from "@21n/types/featureWheel.type";
  import { cn } from "@21n/utils/ui.utils";
  let {
    categories = [],
    selectedCategories = [],
    isHorizontal = false,
    onCategoryClick = (_category: IFwCategory) => {}
  }: {
    categories?: IFwCategory[];
    selectedCategories?: string[];
    isHorizontal?: boolean;
    onCategoryClick?: (category: IFwCategory) => void;
  } = $props();
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
        onclick={() => {
          onCategoryClick(category);
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
