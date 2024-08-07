<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let item: any;
  export let size: Size.sm | Size.md = Size.md;
  export let isApplyCustomColor: boolean = false;
</script>

<button
  class={cn("relative flex flex-col w-full border rounded-md", {
    "h-44": size === Size.sm,
    "h-[15.2rem] w--[17.5rem]": size === Size.md,
    "border-ccs4 hover:border-ccs1": isApplyCustomColor,
    "border-brs3 hover:border-aps2": !isApplyCustomColor
  })}
  on:click
>
  <slot />
  <div
    class={cn(
      "flex flex-col h-fit gap-2 w-full rounded-b-md border-t items-start p-3 truncate",
      {
        "bg-ccs4 border-ccs2": isApplyCustomColor,
        "bg-bgs2 border-brs3": !isApplyCustomColor
      }
    )}
  >
    <slot name="bottom" />
  </div>
</button>
