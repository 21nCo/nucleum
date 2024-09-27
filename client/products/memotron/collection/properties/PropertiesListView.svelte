<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import PropertyItem from "./PropertyItem.svelte";
  import type { INodeProperty } from "$lib/client/products/memotron/node/node.type";
  import type { IProperty } from "./property.type";
  import {
    resolvePropertiesForCapture,
    resolvePropertiesForNodePage
  } from "./property.utils";
  import { onMount } from "svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { Size } from "$lib/client/types/size.enum";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let propertyConfig: IProperty[] = [];
  export let properties: INodeProperty[] = [];
  export let nodeId: string | undefined = undefined;
  export let context: "capture" | "nodepage" | "medianode" | "rightpanel" =
    "capture";
  export let isReadMode: boolean = false;
  export let isCollapsed: boolean = false;
  let isPropertiesPaneContext: boolean =
    context === "rightpanel" || context === "medianode";
  let isCollapserHovered: boolean = false;

  onMount(async () => {
    //TODO - show properties grouped by type if context is right panel
    if (propertyConfig) await refresh();
  });

  async function refresh() {
    if (context === "capture")
      properties = resolvePropertiesForCapture(propertyConfig);
    else if (context === "nodepage")
      properties = resolvePropertiesForNodePage(propertyConfig);
  }
</script>

{#if properties && properties.length > 0}
  <div
    class={cn("w-full", {
      "xl:px-6": !isPropertiesPaneContext && !isCollapsed,
      "xl:px-10": !isPropertiesPaneContext && isCollapsed
    })}
  >
    <div
      class={cn("flex flex-col border border-bgs1 rounded-md", {
        "border-brs3": isCollapsed || isCollapserHovered
      })}
    >
      {#if !isPropertiesPaneContext}
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
              <Badge text={properties.length} />
            {/if}
          </span>
          <span class="h-3 flex gap-3 items-center">
            {#if isCollapserHovered}
              {#if context === "nodepage"}
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
      {#if !isCollapsed || isPropertiesPaneContext}
        <div
          class={cn("flex w-full flex-wrap gap-8", {
            "px-4 pb-4": !isPropertiesPaneContext,
            "flex-col":
              $view.isPortrait ||
              (isPropertiesPaneContext && context === "rightpanel") ||
              (isReadMode && context === "nodepage")
          })}
        >
          {#each properties as property, index (property.id)}
            {#if propertyConfig.some((x) => x.id === property.id)}
              <PropertyItem
                {property}
                config={propertyConfig.find((x) => x.id === property.id)}
                {nodeId}
                {isPropertiesPaneContext}
                {isReadMode}
                on:change
              />
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
