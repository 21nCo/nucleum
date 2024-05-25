<script lang="ts">
  import BreadcrumbItemView from "./BreadcrumbItemView.svelte";
  import type { BreadcrumbItem } from "$lib/client/types/breadcrumbItem.type";
  export let items: BreadcrumbItem[] = [];
</script>

{#if items?.length > 0}
  <div class="flex remove-scrollbar rounded-md">
    {#each items as item, index (item)}
      <BreadcrumbItemView {...item} isLast={index === items.length - 1} />
    {/each}
  </div>
{/if}
