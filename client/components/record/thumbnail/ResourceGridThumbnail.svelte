<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  export let item: any;
  export let size: Size.sm | Size.md = Size.md;
  export let isApplyCustomColor: boolean = false;
  export let isMasonry: boolean = false;
  export let isHidePreview: boolean = false;
  $: item;
</script>

<button
  class={cn("relative flex flex-col w-full rounded-md", {
    "h-full": isMasonry,
    border: !isMasonry && !isHidePreview,
    "h-44": size === Size.sm,
    "h-[15.2rem] w--[17.5rem]": size === Size.md && !isHidePreview,
    "border-ccs4 notouch:hover:border-ccs1 active:border-ccs1":
      isApplyCustomColor,
    "border-brs2 notouch:hover:border-brs4 active:border-brs4":
      !isApplyCustomColor && !isHidePreview
  })}
  on:click
>
  <slot />
  {#if !isMasonry}
    <div
      class={cn(
        "flex flex-col h-fit gap-1.5 w-full items-start px-3 py-2 truncate",
        {
          "border-t rounded-b-md": !isHidePreview,
          "border rounded-md": isHidePreview,
          "bg-ccs4 border-ccs2": isApplyCustomColor,
          "bg-bgs2 border-brs2": !isApplyCustomColor
        }
      )}
    >
      <slot name="bottom" />
    </div>
  {/if}
</button>
