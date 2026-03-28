<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import view from "@21n/stores/view.store";
  import { cn } from "@21n/utils/ui.utils";
  import PropertyItem from "@21n/components/collection/properties/PropertyItem.svelte";
  import {
    resolvePropertiesForCapture,
    resolvePropertiesForNodePage
  } from "@21n/components/collection/properties/property.utils";
  import { onMount } from "svelte";
  import { hoverable } from "@21n/actions/hover.action";
  import { Size } from "@21n/types/size.enum";
  import Badge from "@21n/elements/text/Badge.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { createEventDispatcher } from "svelte";
  import type {
    ICollectionExpanded,
    ICollectionItem,
    ICollectionItemPropertyValue
  } from "@21n/components/collection/collection.type";
  import type {
    IProperty,
    IPropertyConfigOption
  } from "@21n/components/collection/properties/property.type";
  import {
    removeDuplicatesFilter,
    resourceInList
  } from "@21n/components/flux/resourceStores/resource.utils";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  import { propertyStore } from "@21n/components/collection/properties/property.store";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { NodeType } from "@21n/products/memotron/node/node.type";
  const dispatch = createEventDispatcher();
  export let types: ICollectionExpanded[] | undefined = undefined;
  export let isIncludeExtendedProperties: boolean = true;
  export let values: ICollectionItemPropertyValue[] = [];
  export let item: ICollectionItem | null = null;
  export let resource: Resource;
  export let parentBgIndex: number = 1;
  export let context: "capture" | "clip" | "mainpanel" | "rightpanel" =
    "capture";
  export let isReadOnlyMode: boolean = false;
  export let isCollapsed: boolean = false;
  let properties: IProperty[] = [];
  /**
   * Renders properties as column
   */
  let isRenderAsColumn: boolean =
    context === "rightpanel" || context === "clip";
  let isCollapserHovered: boolean = false;

  function isProperty(value: IProperty | undefined): value is IProperty {
    return Boolean(value);
  }

  function isNodeItem(
    value: ICollectionItem | null
  ): value is ICollectionItem & { contentType: NodeType } {
    return Boolean(value && "contentType" in value);
  }

  onMount(async () => {
    if (types) await refresh();
  });

  async function refresh() {
    if (!types) return;
    let propertyConfig = types
      .map((x) => x.properties)
      .flat()
      .filter(isProperty);
    if (isIncludeExtendedProperties) {
      const extendedProps = types
        .map((x) => x.extendProperties)
        .flat()
        .filter((x) => x) as IProperty[];
      propertyConfig = propertyConfig.concat(extendedProps);
      propertyConfig = propertyConfig.filter(removeDuplicatesFilter);
    }
    if (propertyConfig.length === 0) return;
    if (context === "capture" || context === "clip")
      properties = resolvePropertiesForCapture(propertyConfig);
    else if (context === "mainpanel")
      properties = resolvePropertiesForNodePage(propertyConfig);
    else if (context === "rightpanel") properties = propertyConfig;
    dispatch("propertyCount", properties.length);
  }

  async function onNewOption(e: CustomEvent) {
    const property = properties.find(resourceInList(e.detail.id));
    if (!property) return;
    const newOption: IPropertyConfigOption = {
      id: generateSimpleRandomId(),
      label: e.detail.label,
      color: Math.random() * 360
    };
    if (!property.config || !("options" in property.config)) return;
    property.config.options = [...(property.config.options ?? []), newOption];
    const result = await propertyStore.modify(property.id, {
      config: property.config
    });
    dispatch("change", {
      id: property.id,
      value: newOption.id
    });
  }

  async function onConfigChange(e: CustomEvent) {
    const property = properties.find(resourceInList(e.detail.id));
    if (!property) return;
    const result = await propertyStore.modify(property.id, {
      config: e.detail.config,
      default: e.detail.default
    });
    property.config = e.detail.config;
    property.default = e.detail.default;
  }
</script>

{#if properties && properties.length > 0}
  <div
    class={cn(
      "w-full userdata",
        !isRenderAsColumn &&
        !$view.isConstrainedWidth &&
        resource === Resource.node &&
        isNodeItem(item) &&
        item.contentType === NodeType.NODULAR_MARKDOWN && {
          "pl-8": !isCollapsed,
          "pl-12": isCollapsed
        }
    )}
  >
    <div
      class={cn(
        "flex flex-col rounded-md",
        !isRenderAsColumn && {
          border: true,
          "border-brs3":
            isCollapsed ||
            isCollapserHovered ||
            (resource === Resource.goal && !$view.isConstrainedWidth),
          "border-transparent":
            !isCollapsed &&
            !isCollapserHovered &&
            !(resource === Resource.goal && !$view.isConstrainedWidth)
        }
      )}
    >
      {#if !isRenderAsColumn}
        <button
          class={cn("flex justify-between items-center w-full rounded-md", {
            "px-4 py-2": isCollapsed,
            "mo:px-0 p-4": !isCollapsed
          })}
          on:click={() => {
            isCollapsed = !isCollapsed;
          }}
          use:hoverable={{
            onHover: (val) => (isCollapserHovered = val)
          }}
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
              {#if context === "mainpanel"}
                <Button
                  label="See all"
                  icon="proceed"
                  size={Size.sm}
                  style={ButtonStyle.PLAIN}
                  on:click={(e) => {
                    dispatch("showAll");
                    if (e) e.stopPropagation();
                  }}
                />
              {/if}
              <Button
                icon={isCollapsed ? "chevron-down" : "chevron-up"}
                tooltip={isCollapsed ? "Expand" : "Collapse"}
              />
            {/if}
          </span>
        </button>
      {/if}
      {#if !isCollapsed || isRenderAsColumn}
        <div
          class={cn("flex w-full flex-wrap gap-8", {
            "mo:px-0 px-4 pb-4": !isRenderAsColumn,
            "flex-col":
              $view.isPortrait ||
              (isRenderAsColumn && context === "rightpanel") ||
              (isReadOnlyMode && context === "mainpanel")
          })}
        >
          {#each properties as property (property.id)}
            <PropertyItem
              value={values?.find(resourceInList(property))?.value}
              {property}
              {item}
              isPropertiesPaneContext={isRenderAsColumn}
              {isReadOnlyMode}
              {parentBgIndex}
              on:change={(e) => {
                dispatch("change", {
                  id: property.id,
                  value: e.detail
                });
              }}
              on:newOption={onNewOption}
              on:configChange={onConfigChange}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}
