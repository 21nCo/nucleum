<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import PropertyItem from "./PropertyItem.svelte";
  import type { INodeProperty } from "$lib/client/products/memotron/node/node.type";
  import type { ICollection } from "$lib/client/products/memotron/collection/collection.type";
  import type { IProperty } from "./property.type";
  import { get } from "svelte/store";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { resolvePropertiesForCapture } from "./property.utils";
  import { onMount } from "svelte";
  export let types: string[] | undefined = undefined;
  export let properties: INodeProperty[] = [];
  export let nodeId: string | undefined = undefined;
  export let context: "capture" | "nodepage" | "rightpanel" = "capture";
  export let isReadMode: boolean = false;
  export let isCollapsed: boolean = false;
  let isPropertiesPaneContext: boolean = context === "rightpanel";
  let isCollapserHovered: boolean = false;
  let propertyConfig: IProperty[] = [];
  onMount(async () => {
    if (types) await resolvePropertyConfig(types);
  });
  $: console.log({ types, propertyConfig });

  async function resolvePropertyConfig(types: string[]) {
    console.log("resolvePropertyConfig", { types });
    const dexie = get(dataManager).cacheSource.dexie;
    const typeWithDetails = await dexie.collection
      .where("id")
      .anyOf(types)
      .toArray();
    let totalPropertyList: string[] = [];
    await typeWithDetails.forEach(async (type) => {
      const props = await resolveTypeProperties(type);
      console.log("props", { props });
      if (totalPropertyList)
        totalPropertyList = [...totalPropertyList, ...props];
    });
    //TODO - show properties grouped by type if context is right panel
    if (totalPropertyList.length === 0) return;
    propertyConfig = await dexie.property
      .where("id")
      .anyOf(totalPropertyList)
      .toArray();
    if (context === "capture")
      properties = resolvePropertiesForCapture(propertyConfig);
    return propertyConfig;

    async function resolveTypeProperties(type: ICollection) {
      let totalPropertyList: string[] = [];
      if (type.properties) {
        totalPropertyList = type.properties;
      }
      if (type.typeToExtend) {
        const extendedType = await dexie.collection.get(type.typeToExtend);
        if (extendedType?.properties) {
          totalPropertyList = [
            ...extendedType.properties,
            ...totalPropertyList
          ];
        }
      }
      return totalPropertyList;
    }
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
