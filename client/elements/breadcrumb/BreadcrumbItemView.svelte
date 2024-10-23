<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  import TextWithHoverTooltip from "../text/TextWithHoverTooltip.svelte";
  const dispatch = createEventDispatcher();
  export let label: string = "";
  export let isCollapse: boolean = false;
  export let isDisabled: boolean = false;
  export let isLast: boolean = false;
  export let truncateLength: number | undefined = undefined;
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      dispatch("enter");
    }
  }
</script>

<button
  class="flex items-center justify-center w-fit whitespace-nowrap text-fgs2 hover:text-fgs1"
>
  <!-- <div class="triangle bg-fgs2 w-[8px] h-[7px] mr-1" /> -->
  <button
    on:click
    on:keydown={handleKeyDown}
    id="breadcrumb-item-label"
    class={cn("text-b2 cursor-pointer", {
      "opacity-50 cursor-not-allowed": isDisabled,
      "text-ccs1": isLast,
      "hover:underline": !isLast
    })}
  >
    <TextWithHoverTooltip
      truncateLength={isCollapse ? undefined : truncateLength}
      text={isCollapse ? "・・" : label}
      tooltip={label}
    />
  </button>
  {#if !isLast}
    <div class="px-2 opacity-50">/</div>
  {/if}
</button>

<style>
  .triangle {
    clip-path: polygon(0% 50%, 100% 0%, 100% 100%);
  }
</style>
