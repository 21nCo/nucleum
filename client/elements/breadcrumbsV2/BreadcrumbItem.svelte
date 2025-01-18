<script lang="ts">
  import { tooltip } from "$lib/client/actions/popover.action";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let label: string = "";
  export let isDisabled: boolean = false;
  export let isLast: boolean = false;
  export let isOverflowItem: boolean = false;

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      dispatch("enter");
    }
  }
</script>

<div class={cn("flex min-w-10 w-fit items-center")}>
  <button
    on:click
    on:keydown={handleKeyDown}
    id="breadcrumb-item-label"
    class={cn("cursor-pointer text-b2 truncate min-w-10 w-full text-left", {
      "opacity-50 cursor-not-allowed": isDisabled,
      "text-ccs1": isLast,
      "hover:underline": !isLast && !isOverflowItem,
      "hover:bg-bgs3 rounded-md p-2": isOverflowItem
    })}
    use:tooltip={{
      text: label,
      isEnableOnlyOnTruncate: true
    }}
  >
    {label}
  </button>
  {#if !isLast && !isOverflowItem}
    <div class={cn("px-2 opacity-50 flex-shrink-0")}>/</div>
  {/if}
</div>

<style>
  .triangle {
    clip-path: polygon(0% 50%, 100% 0%, 100% 100%);
  }
</style>
