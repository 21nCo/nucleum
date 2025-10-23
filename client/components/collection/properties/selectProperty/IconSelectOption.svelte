<script lang="ts">
  import { tooltip } from "@21n/actions/popover.action";
  import { cn } from "@21n/utils/ui.utils";
  import type { IPropertyConfigOption } from "@21n/components/collection/properties/property.type";
  export let option: IPropertyConfigOption;
  export let value: string | string[] | null = null;
  $: isActive = Array.isArray(value)
    ? value.includes(option.id)
    : value === option.id;
</script>

<button
  class={cn("px-2 py-1.5 rounded-md border text-h4", {
    "bg-aps3 border-aps1": isActive,
    "border-brs2 hover:bg-bgs2": !isActive
  })}
  on:click
  use:tooltip={{
    text: option.label
  }}
>
  {option.icon}
</button>
