<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import Divider from "$lib/client/elements/Divider.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import {
    iconSelectPropertyTypes,
    UniversalPropertyType,
    type IPropertyConfigOption,
    type IUniversalProperty
  } from "$lib/client/components/collection/properties/property.type";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { universalPropertyOptions } from "../../property.store";
  import { resolveUniversalPropertyOptions } from "../../property.utils";
  import UniversalPropertyConfigPopover from "./UniversalPropertyConfigPopover.svelte";
  export let property: IUniversalProperty;
  export let isPopoverOpen: boolean = false;
  let ref: HTMLElement;
  let options: IPropertyConfigOption[] = [];

  $: isIconSelectType =
    property.config?.type &&
    iconSelectPropertyTypes.includes(property.config.type);

  $: if (property.config?.type) {
    options = resolveUniversalPropertyOptions(property.config.type);
  }

  function resolvePropertyIcon(type: UniversalPropertyType) {
    return (
      universalPropertyOptions.find((x) => x.value === type)?.icon ??
      "caret-circle-down"
    );
  }
</script>

<div
  class="rounded-md w-full flex items-center justify-between px-3 h-full"
  bind:this={ref}
  use:popover={{
    content: UniversalPropertyConfigPopover,
    isSpanToTriggerWidth: true,
    id: `universal-property-config-popover-${property.id || "default"}`,
    componentProps: {
      config: property.config,
      onChange: (e) => {
        if (e.type) {
          ref.dispatchEvent(new CustomEvent("hide"));
        }
        property = { ...property, config: { ...property.config, ...e } };
      }
    }
  }}
  on:change={(e) => {
    isPopoverOpen = e.detail?.open;
  }}
>
  <span class="flex items-center gap-2">
    {#if property.config?.type && property.config?.type !== UniversalPropertyType.NONE}
      <Icon
        icon={property.config?.isMultiSelect
          ? "ph:list-bullets-light"
          : resolvePropertyIcon(property.config.type)}
        size={Size.sm}
      />
      <span class="whitespace-nowrap">
        {enumToString(property.config?.type)}
      </span>
    {:else}
      <span class="text-b2 placeholder"> Please select sub type </span>
    {/if}
  </span>
  <Icon
    icon={isPopoverOpen ? "chevron-up" : "chevron-down"}
    size={Size.sm}
  />
  {#if property.config?.type && property.config?.type !== UniversalPropertyType.NONE}
    <span class="flex gap-2 items-center w-1/2 h-full">
      <Divider
        orientation={Orientation.Vertical}
        colorStrength={ColorStrength.Strong}
      />
      {#if isIconSelectType}
        <div class="flex text-b2 justify-around w-full">
          {#each options as icon}
            <span>
              {icon.icon}
            </span>
          {/each}
        </div>
      {:else}
        <span class="text-b3 text-fgs3">
          {options.length}
          {options.length === 1 ? "option" : "options"}
        </span>
      {/if}
    </span>
  {/if}
</div>
