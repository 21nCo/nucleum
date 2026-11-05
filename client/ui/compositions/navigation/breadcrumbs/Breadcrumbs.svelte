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
    isLeading = false,
    onItemClick = undefined
  }: {
    items?: IBreadcrumbItem[];
    limit?: number;
    /**
     * Whether the items lead into content rendered after them, such as a
     * title: every item ends with a separator, and past `limit` the farthest
     * items collapse behind an ellipsis, keeping the last `limit` items.
     */
    isLeading?: boolean;
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

{#snippet overflow(hidden: IBreadcrumbItem[])}
  <button
    class="flex-shrink-0"
    aria-label="Show hidden breadcrumbs"
    use:popover={{
      content: BreadcrumbsOverflowPopover,
      triggerMethod: [PopoverTriggerMethod.CLICK],
      id: "breadcrumbs-overflow-popover",
      componentProps: {
        items: hidden,
        onItemClick
      }
    }}
  >
    <span class="px-2 rounded-md hover:bg-bgs2"> .... </span>
    <span class="px-2 opacity-50">/</span>
  </button>
{/snippet}

{#if items?.length > 0 && isLeading}
  <div class="flex min-w-0 shrink items-center" data-testid="breadcrumbs">
    {#if items.length > limit}
      {@render overflow(items.slice(0, -limit))}
    {/if}
    {#each items.slice(-limit) as item (item)}
      <BreadcrumbItem
        label={item.label}
        isDisabled={item.disabled}
        onClick={(e) => {
          handleClick(e, item);
        }}
      />
    {/each}
  </div>
{:else if items?.length > 0}
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
      {@render overflow(items.slice(1, -1))}
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
