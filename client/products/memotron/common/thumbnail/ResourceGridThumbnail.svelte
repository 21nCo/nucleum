<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let item: any;
  export let size: Size.sm | Size.md = Size.md;
  export let isApplyCustomColor: boolean = false;
  export let isMasonry: boolean = false;
  export let isHidePreview: boolean = false;
</script>

<button
  class={cn("relative flex flex-col w-full rounded-md", {
    "h-full": isMasonry,
    border: !isMasonry && !isHidePreview,
    "h-44": size === Size.sm,
    "h-[15.2rem] w--[17.5rem]": size === Size.md && !isHidePreview,
    "border-ccs4 hover:border-ccs1": isApplyCustomColor,
    "border-brs3 hover:border-aps2": !isApplyCustomColor && !isHidePreview
  })}
  on:click
>
  <slot />
  {#if !isMasonry}
    <div
      class={cn("flex flex-col h-fit gap-2 w-full items-start p-3 truncate", {
        "border-t rounded-b-md": !isHidePreview,
        "border rounded-md": isHidePreview,
        "bg-ccs4 border-ccs2": isApplyCustomColor,
        "bg-bgs2 border-brs3": !isApplyCustomColor
      })}
    >
      <slot name="bottom" />
    </div>
  {/if}
</button>
