<script lang="ts">
  import BreadcrumbItemView from "./BreadcrumbItemView.svelte";
  import type { BreadcrumbItem } from "$lib/client/types/breadcrumbItem.type";
  import { textTruncateMapper } from "$lib/client/utils/utils";
  import view from "$lib/client/stores/view.store";
  import { Display } from "$lib/client/types/view.type";
  import { determineTruncateLength } from "$lib/shared/utils/text.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { createEventDispatcher } from "svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { Size } from "$lib/client/types/size.enum";
  const dispatch = createEventDispatcher();
  export let items: BreadcrumbItem[] = [];
  export let isPreventDefault: boolean = false;
  export let spaceAvailable: Size.sm | Size.md | Size.lg = Size.md;
  $: slice = resolveSlice($view.display);
  $: truncateLength = determineTruncateLength($view.display, spaceAvailable);
  // let truncateLength = undefined;
  let _items: BreadcrumbItem[] = [];
  $: _items =
    slice != undefined && slice <= items.length
      ? [
          ...items.slice(0, Math.floor(slice / 2)),
          ...(items.length > slice
            ? [
                {
                  isCollapse: true,
                  label: items
                    .slice(Math.floor(slice / 2), -Math.ceil(slice / 2))
                    .map((x) =>
                      textTruncateMapper(x.label, truncateLength + 10)
                    )
                    .join(" / ")
                }
              ]
            : []),
          ...items.slice(-Math.ceil(slice / 2))
        ]
      : items;

  function resolveSlice(display: Display) {
    if (display === Display.MO || display === Display.CW) {
      return 2;
    } else if (display === Display.TP || display === Display.DP) {
      return 3;
    } else if (display === Display.TK) {
      return 4;
    } else {
      return 2;
    }
  }
  function onClick(e: MouseEvent, item: BreadcrumbItem) {
    if (isPreventDefault) {
      dispatch("click", { event: e, item });
      return;
    }
    if (item.path) appStore.gotoPath(item.path);
    else if (item.resourceId)
      appStore.gotoResource(
        item.resourceId.split(":")[0] as Resource,
        item.resourceId
      );
  }
</script>

{#if _items?.length > 0}
  <div class="flex remove-scrollbar rounded-md">
    {#each _items as item, index (item)}
      <BreadcrumbItemView
        {truncateLength}
        {...item}
        isLast={index === _items.length - 1}
        on:click={(e) => {
          onClick(e, item);
        }}
      />
    {/each}
  </div>
{/if}
