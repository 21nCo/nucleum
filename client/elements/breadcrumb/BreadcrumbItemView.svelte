<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import TextWithHoverTooltip from "@21n/elements/text/TextWithHoverTooltip.svelte";
  const dispatch = createEventDispatcher();
  export let label: string = "";
  export let isCollapse: boolean = false;
  export let isDisabled: boolean = false;
  export let isLast: boolean = false;
  export let truncateLength: number | undefined = undefined;
  export let isSubtleContext: boolean = false;

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      dispatch("enter");
    }
  }
</script>

<button
  class={cn(
    "flex items-center justify-center w-fit whitespace-nowrap text-fgs2",
    {
      "hover:text-fgs1": !isSubtleContext
    }
  )}
>
  <!-- <div class="triangle bg-fgs2 w-[8px] h-[7px] mr-1" /> -->
  <button
    on:click
    on:keydown={handleKeyDown}
    id="breadcrumb-item-label"
    class={cn("cursor-pointer", {
      "opacity-50 cursor-not-allowed": isDisabled,
      "text-ccs1": isLast && !isSubtleContext,
      "hover:underline": !isLast,
      "text-b2 ": !isSubtleContext,
      "text-b3": isSubtleContext
    })}
  >
    <TextWithHoverTooltip
      truncateLength={isCollapse ? undefined : truncateLength}
      text={isCollapse ? "・・" : label}
      tooltip={label}
    />
  </button>
  {#if !isLast}
    <div
      class={cn("px-2 opacity-50", {
        "text-b4": isSubtleContext
      })}
    >
      /
    </div>
  {/if}
</button>

<style>
  .triangle {
    clip-path: polygon(0% 50%, 100% 0%, 100% 100%);
  }
</style>
