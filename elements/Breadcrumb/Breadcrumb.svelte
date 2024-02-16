<script lang="ts">
  import BreadcrumbItem from "./BreadcrumbItem.svelte";
  import type { BreadcrumbItem as BreadcrumbItemType } from "$lib/tidy/types/breadcrumbItem.type";
  export let items: BreadcrumbItemType[] = [];
</script>

<div class="flex remove-scrollbar rounded-md">
  {#each items as item, index}
    <BreadcrumbItem {...item} isLast={index === items.length - 1} />
  {/each}
</div>
