<script lang="ts">
  import type { IBreadcrumbItem } from "@21n/elements/breadcrumbsV2/breadcrumbItem.type";
  import { appStore } from "@21n/stores/app.store";
  import { createEventDispatcher } from "svelte";
  import BreadcrumbItem from "@21n/elements/breadcrumbsV2/BreadcrumbItem.svelte";
  import { popover } from "@21n/actions/popover.action";
  import BreadcrumbsOverflowPopover from "@21n/elements/breadcrumbsV2/BreadcrumbsOverflowPopover.svelte";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { cn } from "@21n/utils/ui.utils";
  const dispatch = createEventDispatcher();
  export let items: IBreadcrumbItem[] = [];
  /**
   * Delegates click event when set to `true` instead of defaulting to resource click handler
   */
  export let isPreventDefault: boolean = false;
  export let limit: number = 3;

  function onClick(e: MouseEvent, item: IBreadcrumbItem) {
    if (isPreventDefault) {
      dispatch("click", { event: e, item });
      return;
    }
    if (item.path) appStore.gotoPath(item.path);
    else if (item.resourceId) {
      const lastItem = items[items.length - 1];
      const replaceId = lastItem.id ?? lastItem.resourceId;
      appStore.resourceClickHandler(e, item.resourceId, {
        replaceId
      });
    }
  }
</script>

{#if items?.length > 0}
  <div class="flex w-full items-center">
    {#if items.length > limit}
      <div class="flex-shrink-0">
        <BreadcrumbItem
          label={items[0].label}
          on:click={(e) => {
            onClick(e, items[0]);
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
            replaceId: items[items.length - 1].id
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
            on:click={(e) => {
              onClick(e, item);
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
            on:click={(e) => {
              onClick(e, item);
            }}
          />
        </div>
      {/each}
    {/if}
  </div>
{/if}
