<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IProperty, PropertyType } from "../property.type";
  import PropertyTypeSelectorPopover from "./PropertyTypeSelectorPopover.svelte";
  import { autoPropertyOptions, propertyOptions } from "../property.store";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import {
    PropertyTypeGroup,
    PropertyTypeMode,
    type IPropertyTypeSelectorGroup
  } from "./propertyTypeSelector.type";

  export let row: IProperty;
  export let onChange: (e: { id: IRecordId; type: PropertyType }) => void;
  let isPopoverVisible = false;
  let ref: HTMLDivElement;

  const groups: IPropertyTypeSelectorGroup[] = [
    {
      id: PropertyTypeGroup.TEXT,
      label: "",
      order: 0,
      mode: PropertyTypeMode.MANUAL
    },
    {
      id: PropertyTypeGroup.SELECT,
      label: "Select from options",
      order: 1,
      mode: PropertyTypeMode.MANUAL
    },
    {
      id: PropertyTypeGroup.WIZARD,
      label: "More",
      order: 2,
      mode: PropertyTypeMode.MANUAL
    },
    {
      id: PropertyTypeGroup.SYSTEM,
      label: "System",
      info: {
        body: "Property values are automatically created and updated by the system when the node entry is created or updated.",
        size: Size.xs
      },
      order: 1,
      mode: PropertyTypeMode.AUTO
    },
    {
      id: PropertyTypeGroup.DETECTION,
      label: "Auto detection",
      info: {
        body: "Property values are automatically detected during creation.",
        size: Size.xs
      },
      order: 2,
      mode: PropertyTypeMode.AUTO
    },
    {
      id: PropertyTypeGroup.RULE_BASED,
      label: "Rule based",
      order: 0,
      badge: "Planned",
      isDisabled: true,
      mode: PropertyTypeMode.AUTO
    },
    {
      id: PropertyTypeGroup.INTEGRATION,
      label: "Integration",
      info: {
        body: "Property values are automatically populated from external sources.",
        size: Size.xs
      },
      order: 3,
      mode: PropertyTypeMode.AUTO,
      badge: "Planned",
      isDisabled: true
    }
  ];
  const options: DropdownItem[] = [...propertyOptions, ...autoPropertyOptions];
  $: selected = options.find((option) => option.value === row.type);
</script>

<div
  class={cn(
    "flex w-full justify-between items-center gap-2 rounded-md border p-2 h-11",
    {
      "border-brs3": !isPopoverVisible,
      "border-aps1": isPopoverVisible
    }
  )}
  bind:this={ref}
  use:popover={{
    content: PropertyTypeSelectorPopover,
    placement: Placement.Right,
    id: `property-type-selector-popover-${row.id || "default"}`,
    componentProps: {
      groups,
      options,
      onSelect: (e) => {
        // if (e) row.type = e;
        onChange?.({ id: row.id, type: e });
        ref.dispatchEvent(new CustomEvent("hide"));
      }
    }
  }}
  on:change={(e) => {
    isPopoverVisible = e.detail?.open;
  }}
>
  <span class="flex items-center gap-1">
    {#if selected?.icon && typeof selected.icon === "string"}
      <Icon icon={selected.icon} size={Size.sm} />
    {/if}
    <span class="text-b2 whitespace-nowrap">
      {selected?.label}
    </span>
  </span>
  <Icon
    icon={isPopoverVisible ? "chevron-right" : "chevron-down"}
    size={Size.sm}
  />
</div>
