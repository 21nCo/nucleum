<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import view from "$lib/tidy/stores/view.store";
  import { cn } from "$lib/tidy/utils/ui.utils";
  import PropertyItem from "./PropertyItem.svelte";
  import type { NodeProperty } from "$lib/tidy/types/memotron/node.type";
  export let properties: NodeProperty[] = [];
  export let nodeId: string | undefined = undefined;
  export let type: any;
  export let isPropertiesPaneContext: boolean = false;
  export let isReadMode: boolean = false;
  export let isCollapsed: boolean = false;
  let isCollapserHovered: boolean = false;
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
          on:mouseenter={() => {
            isCollapserHovered = true;
          }}
          on:mouseleave={() => {
            isCollapserHovered = false;
          }}
        >
          <span>
            <span class="text-base text-fgs3"> Properties </span>
            {#if isCollapsed}
              <span class="bg-bgs2 text-b3 text-fgs2 rounded-md px-1 py-0.5"
                >{properties.length}</span
              >
            {/if}
          </span>
          <Button
            icon={isCollapsed ? "chevdown" : "chevup"}
            tooltip={isCollapsed ? "Expand" : "Collapse"}
          />
        </button>
      {/if}
      {#if !isCollapsed || isPropertiesPaneContext}
        <div
          class={cn("flex w-full flex-wrap gap-8", {
            "px-4 pb-4": !isPropertiesPaneContext,
            "flex-col":
              $view.isPortrait || isPropertiesPaneContext || isReadMode
          })}
        >
          {#each properties as property, index (property.id)}
            <PropertyItem
              {property}
              {type}
              {nodeId}
              {isPropertiesPaneContext}
              {isReadMode}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
