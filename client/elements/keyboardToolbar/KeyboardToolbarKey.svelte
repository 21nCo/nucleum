<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let icon: string;
  export let isApplySystemColors = false;
</script>

<button
  class={cn(
    "flex items-center justify-center rounded-md p-1 h-[42px] w-[34px] min-w-[34px] min-h-[42px] click:bg-fgs4 shadow-sm",
    {
      "bg-white dark:bg-[#6b6b6b]": isApplySystemColors,
      "bg-bgs3": !isApplySystemColors
    }
  )}
  on:click
  on:mousedown={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}
>
  <Icon {icon} size={Size.sm} />
</button>
