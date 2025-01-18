<script lang="ts">
  import BreadcrumbItem from "./BreadcrumbItem.svelte";
  import type { IBreadcrumbItem } from "./breadcrumbItem.type";

  export let items: IBreadcrumbItem[];
</script>

<div class="p-2 w-72 bg-bgs2 flex flex-col gap-2">
  {#each items as item, index (item)}
    <div class="flex w-full truncate">
      <BreadcrumbItem label={item.label} isOverflowItem={true} />
    </div>
  {/each}
</div>
