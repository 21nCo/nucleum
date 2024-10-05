<script lang="ts">
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import { Size } from "$lib/client/types/size.enum";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "../Icon.svelte";
  import Badge from "../text/Badge.svelte";
  export let item: DropdownItem;
</script>

<button
  on:click
  class={cn("text-left px-3 py-2 hover:bg-bgs2 w-full", {
    "text-fgs3": item.isDisabled
  })}
>
  <div class="flex items-center justify-between gap-2">
    <span class="flex items-center gap-2">
      {#if item.icon && typeof item.icon === "string"}
        <Icon icon={item.icon} size={Size.sm} />
      {/if}
      <span>
        {item.label ?? properCase(item.value)}
      </span>
    </span>
    {#if item.badge}
      <Badge text={item.badge} />
    {/if}
  </div>
</button>
