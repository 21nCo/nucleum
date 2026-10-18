<script lang="ts">
  import BreadcrumbItem from "@21n/ui/compositions/navigation/breadcrumbs/BreadcrumbItem.svelte";
  import type { IBreadcrumbItem } from "@21n/ui/compositions/navigation/breadcrumbs/breadcrumbItem.type";
  let {
    items,
    onItemClick = undefined
  }: {
    items: IBreadcrumbItem[];
    onItemClick?: (payload: {
      event: MouseEvent | KeyboardEvent;
      item: IBreadcrumbItem;
    }) => void;
  } = $props();
</script>

<div class="p-2 w-72 bg-bgs2 flex flex-col gap-2">
  {#each items as item, index (item)}
    <div class="flex w-full truncate">
      <BreadcrumbItem
        label={item.label}
        isOverflowItem={true}
        onClick={(event) => onItemClick?.({ event, item })}
      />
    </div>
  {/each}
</div>
