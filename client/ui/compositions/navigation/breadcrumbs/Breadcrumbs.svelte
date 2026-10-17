<script lang="ts">
  import type { IBreadcrumbItem } from "@21n/ui/compositions/navigation/breadcrumbs/breadcrumbItem.type";
  import BreadcrumbItem from "@21n/ui/compositions/navigation/breadcrumbs/BreadcrumbItem.svelte";
  import { popover } from "@21n/ui/actions/popover.action";
  import BreadcrumbsOverflowPopover from "@21n/ui/compositions/navigation/breadcrumbs/BreadcrumbsOverflowPopover.svelte";
  import { PopoverTriggerMethod } from "@21n/ui/actions/popover.type";
  import { cn } from "@21n/ui/environment/presentation";
  let {
    items = [],
    limit = 3,
    onItemClick = undefined
  }: {
    items?: IBreadcrumbItem[];
    limit?: number;
    onItemClick?: (payload: {
      event: MouseEvent | KeyboardEvent;
      item: IBreadcrumbItem;
    }) => void;
  } = $props();

  function handleClick(e: MouseEvent | KeyboardEvent, item: IBreadcrumbItem) {
    if (item.disabled) return;
    onItemClick?.({ event: e, item });
  }
</script>

{#if items?.length > 0}
  <div class="flex w-full items-center">
    {#if items.length > limit}
      <div class="flex-shrink-0">
        <BreadcrumbItem
          label={items[0].label}
          onClick={(e) => {
            handleClick(e, items[0]);
          }}
        />
      </div>
      <button
        class="flex-shrink-0"
        use:popover={{
          content: BreadcrumbsOverflowPopover,
          triggerMethod: [PopoverTriggerMethod.CLICK],
          id: "breadcrumbs-overflow-popover",
          componentProps: {
            items: items.slice(1, -1),
            onItemClick
          }
        }}
      >
        <span class="px-2 rounded-md hover:bg-bgs2"> .... </span>
        <span class="px-2 opacity-50">/</span>
      </button>
      <div class="flex-1 min-w-0 overflow-hidden">
        {#each items.slice(-1) as item, index}
          <BreadcrumbItem
            label={item.label}
            isDisabled={item.disabled}
            isLast={index === 0}
            onClick={(e) => {
              handleClick(e, item);
            }}
          />
        {/each}
      </div>
    {:else}
      {#each items as item, index (item)}
        <div
          class={cn("flex-shrink-0", {
            "flex-1 min-w-0": index === items.length - 1
          })}
        >
          <BreadcrumbItem
            label={item.label}
            isDisabled={item.disabled}
            isLast={index === items.length - 1}
            onClick={(e) => {
              handleClick(e, item);
            }}
          />
        </div>
      {/each}
    {/if}
  </div>
{/if}
