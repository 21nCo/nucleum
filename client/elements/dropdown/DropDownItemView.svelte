<script lang="ts">
  import type { DropdownItem } from "@21n/types/dropdownItem.type";
  import { Size } from "@21n/types/size.enum";
  import { properCase } from "@21n/shared-utils/text.utils";
  import { cn } from "@21n/utils/ui.utils";
  import Icon from "@21n/elements/Icon.svelte";
  import Badge from "@21n/elements/text/Badge.svelte";
  export let item: DropdownItem;
</script>

<button
  on:click
  class={cn("text-left px-3 py-2 hover:bg-bgs2 w-full", {
    "text-fgs3 cursor-not-allowed": item.isDisabled
  })}
>
  <div class="flex items-center justify-between gap-2">
    <span class="flex items-center gap-2">
      {#if item.icon && typeof item.icon === "string"}
        <Icon icon={item.icon} size={Size.sm} />
      {/if}
      <span class="whitespace-nowrap">
        {item.label ?? properCase(item.value)}
      </span>
    </span>
    {#if item.badge}
      <Badge text={item.badge} />
    {/if}
  </div>
</button>
