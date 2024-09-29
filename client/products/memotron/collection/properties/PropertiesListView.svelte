<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import PropertyItem from "./PropertyItem.svelte";
  import type { INodePropertyValue } from "$lib/client/products/memotron/node/node.type";
  import {
    resolvePropertiesForCapture,
    resolvePropertiesForNodePage,
    resolvePropertyDefaultValue
  } from "./property.utils";
  import { onMount } from "svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { Size } from "$lib/client/types/size.enum";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { createEventDispatcher } from "svelte";
  import type { ICollectionExpanded } from "../collection.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import type { IProperty } from "./property.type";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  const dispatch = createEventDispatcher();
  export let types: ICollectionExpanded[] | undefined = undefined;
  export let isIncludeExtendedProperties: boolean = true;
  export let values: INodePropertyValue[] = [];
  export let nodeId: IRecordId | undefined = undefined;
  export let context: "capture" | "clip" | "mainpanel" | "rightpanel" =
    "capture";
  export let isReadMode: boolean = false;
  export let isCollapsed: boolean = false;
  let properties: IProperty[] = [];
  /**
   * Renders properties as column
   */
  let isRenderAsColumn: boolean =
    context === "rightpanel" || context === "clip";
  let isCollapserHovered: boolean = false;

  onMount(async () => {
    if (types) await refresh();
  });

  async function refresh() {
    if (!types) return;
    let propertyConfig = types
      .map((x) => x.properties)
      .flat()
      .filter((x) => x);
    if (propertyConfig.length === 0) return;
    if (isIncludeExtendedProperties) {
      propertyConfig = propertyConfig.concat(
        types
          .map((x) => x.extendProperties)
          .flat()
          .filter((x) => x) as IProperty[]
      );
      propertyConfig = propertyConfig.filter(
        (x, i) => propertyConfig.findIndex((y) => isSameResource(x, y)) === i
      );
    }
    if (context === "capture" || context === "clip")
      properties = resolvePropertiesForCapture(propertyConfig);
    else if (context === "mainpanel")
      properties = resolvePropertiesForNodePage(propertyConfig);
    else if (context === "rightpanel") properties = propertyConfig;
  }
</script>

{#if properties && properties.length > 0}
  <div
    class={cn("w-full", {
      "xl:px-6": !isRenderAsColumn && !isCollapsed,
      "xl:px-10": !isRenderAsColumn && isCollapsed
    })}
  >
    <div
      class={cn("flex flex-col border border-bgs1 rounded-md", {
        "border-brs3": isCollapsed || isCollapserHovered
      })}
    >
      {#if !isRenderAsColumn}
        <button
          class={cn("flex justify-between items-center w-full rounded-md", {
            "px-4 py-2": isCollapsed,
            "p-4": !isCollapsed
          })}
          on:click={() => {
            isCollapsed = !isCollapsed;
          }}
          use:hoverable
          on:hover={(e) => (isCollapserHovered = e.detail)}
        >
          <span class="flex items-center gap-2">
            <!-- <Icon icon="widget" size={Size.sm} /> -->
            <span class="text-b2 text-fgs3"> Properties </span>
            {#if isCollapsed}
              <Badge text={values.length} />
            {/if}
          </span>
          <span class="h-3 flex gap-3 items-center">
            {#if isCollapserHovered}
              {#if context === "mainpanel"}
                <Button
                  label="See all"
                  icon="ph:arrow-right-thin"
                  size={Size.sm}
                  style={ButtonStyle.PLAIN}
                  on:click={(e) => {
                    dispatch("showAll");
                    if (e.detail) e.detail.stopPropagation();
                  }}
                />
              {/if}
              <Button
                icon={isCollapsed ? "chevdown" : "chevup"}
                tooltip={isCollapsed ? "Expand" : "Collapse"}
              />
            {/if}
          </span>
        </button>
      {/if}
      {#if !isCollapsed || isRenderAsColumn}
        <div
          class={cn("flex w-full flex-wrap gap-8", {
            "px-4 pb-4": !isRenderAsColumn,
            "flex-col":
              $view.isPortrait ||
              (isRenderAsColumn && context === "rightpanel") ||
              (isReadMode && context === "mainpanel")
          })}
        >
          {#each properties as property (property.id)}
            <PropertyItem
              value={values.find((x) => isSameResource(x, property))?.value ??
                resolvePropertyDefaultValue(property)}
              {property}
              {nodeId}
              isPropertiesPaneContext={isRenderAsColumn}
              {isReadMode}
              on:change={(e) => {
                dispatch("change", {
                  id: property.id,
                  value: e.detail
                });
              }}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
