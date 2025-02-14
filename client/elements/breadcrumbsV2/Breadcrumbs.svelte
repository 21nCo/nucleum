<script lang="ts">
  import type { IBreadcrumbItem } from "$lib/client/elements/breadcrumbsV2/breadcrumbItem.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { createEventDispatcher } from "svelte";
  import BreadcrumbItem from "./BreadcrumbItem.svelte";
  import { popover } from "$lib/client/actions/popover.action";
  import BreadcrumbsOverflowPopover from "./BreadcrumbsOverflowPopover.svelte";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  const dispatch = createEventDispatcher();
  export let items: IBreadcrumbItem[] = [];
  /**
   * Delegates click event when set to `true` instead of defaulting to resource click handler
   */
  export let isPreventDefault: boolean = false;

  function onClick(e: MouseEvent, item: IBreadcrumbItem) {
    if (isPreventDefault) {
      dispatch("click", { event: e, item });
      return;
    }
    if (item.path) appStore.gotoPath(item.path);
    else if (item.resourceId)
      appStore.openResource(item.resourceId, ResourceAccessMode.POP, {
        replaceId: items[items.length - 1].id
      });
    // appStore.gotoResource(
    //   item.resourceId.split(":")[0] as Resource,
    //   item.resourceId
    // );
  }
</script>

{#if items?.length > 0}
  <div class="flex w-full remove-scrollbar rounded-md items-center">
    {#if items.length > 3}
      <BreadcrumbItem
        label={items[0].label}
        on:click={(e) => {
          onClick(e, items[0]);
        }}
      />
      <button
        class="flex-shrink-0"
        use:popover={{
          content: BreadcrumbsOverflowPopover,
          triggerMethod: [
            PopoverTriggerMethod.CLICK,
            PopoverTriggerMethod.HOVER
          ],
          componentProps: {
            items: items.slice(1, -2)
          }
        }}
      >
        <span class="px-2 rounded-md hover:bg-bgs2"> .... </span>
        <span class="px-2 opacity-50">/</span>
      </button>
      {#each items.slice(-2) as item, index}
        <BreadcrumbItem
          label={item.label}
          isDisabled={item.disabled}
          isLast={index === 1}
          on:click={(e) => {
            onClick(e, item);
          }}
        />
      {/each}
    {:else}
      {#each items as item, index (item)}
        <BreadcrumbItem
          label={item.label}
          isDisabled={item.disabled}
          isLast={index === items.length - 1}
          on:click={(e) => {
            onClick(e, item);
          }}
        />
      {/each}
    {/if}
  </div>
{/if}
