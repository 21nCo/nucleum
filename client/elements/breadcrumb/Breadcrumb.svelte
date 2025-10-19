<script lang="ts">
  import BreadcrumbItemView from "@21n/elements/breadcrumb/BreadcrumbItemView.svelte";
  import type { IBreadcrumbItem } from "@21n/elements/breadcrumbsV2/breadcrumbItem.type";
  import { textTruncateMapper } from "@21n/utils/utils";
  import view from "@21n/stores/view.store";
  import { Display } from "@21n/types/view.type";
  import { determineTruncateLength } from "@21n/shared-utils/text.utils";
  import { appStore } from "@21n/stores/app.store";
  import { createEventDispatcher } from "svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { Size } from "@21n/types/size.enum";
  const dispatch = createEventDispatcher();
  export let items: IBreadcrumbItem[] = [];
  export let isPreventDefault: boolean = false;
  export let spaceAvailable: Size.sm | Size.md | Size.lg = Size.md;
  export let isSubtleContext: boolean = false;
  $: slice = resolveSlice($view.display);
  $: truncateLength = determineTruncateLength($view.display, spaceAvailable);
  // let truncateLength = undefined;
  let _items: IBreadcrumbItem[] = [];
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
  function onClick(e: MouseEvent, item: IBreadcrumbItem) {
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
        {isSubtleContext}
        {...item}
        isLast={index === _items.length - 1}
        on:click={(e) => {
          onClick(e, item);
        }}
      />
    {/each}
  </div>
{/if}
