<script lang="ts">
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "../Icon.svelte";
  export let item: DropdownItem;
</script>

<button
  on:click
  class={cn("text-left px-3 py-2 hover:bg-bgs2 w-full", {
    "text-fgs3": item.disabled
  })}
>
  <div class="flex items-center gap-2">
    {#if item.icon}
      <Icon icon={item.icon} size={Size.sm} />
    {/if}
    <span>
      {item.label}
    </span>
  </div>
</button>
