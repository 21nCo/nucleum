<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import {
    UniversalPropertyType,
    type IUniversalProperty
  } from "$lib/client/products/memotron/collection/properties/property.type";
  import { Size } from "$lib/client/types/size.enum";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { universalPropertyOptions } from "../../property.store";
  import UniversalPropertyConfigPopover from "./UniversalPropertyConfigPopover.svelte";
  export let property: IUniversalProperty;
  export let isPopoverOpen: boolean = false;
  let ref: HTMLElement;

  function resolvePropertyIcon(type: UniversalPropertyType) {
    return (
      universalPropertyOptions.find((x) => x.value === type)?.icon ??
      "ph:caret-circle-down-light"
    );
  }
</script>

<div
  class="rounded-md w-full flex items-center justify-between px-3 h-full"
  bind:this={ref}
  use:popover={{
    content: UniversalPropertyConfigPopover,
    isSpanToTriggerWidth: true,
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
    <Icon
      icon={property.config?.isMultiSelect
        ? "ph:list-bullets-light"
        : property.config?.type &&
            property.config.type !== UniversalPropertyType.NONE
          ? resolvePropertyIcon(property.config.type)
          : "ph:caret-circle-down-light"}
      size={Size.sm}
    />
    <span class="text-b2"
      >{property.config?.type &&
      property.config?.type !== UniversalPropertyType.NONE
        ? enumToString(property.config?.type)
        : "Please select"}</span
    >
  </span>
  <Icon
    icon={isPopoverOpen ? "ph:caret-up-light" : "ph:caret-down-light"}
    size={Size.sm}
  />
</div>
