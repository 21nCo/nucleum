<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import TextWithHoverTooltip from "../text/TextWithHoverTooltip.svelte";
  export let label: string = "";
  export let path: string = "";
  export let isCollapse: boolean = false;
  export let isDisabled: boolean = false;
  export let isLast: boolean = false;
  export let truncateLength: number | undefined = undefined;

  function handleClick() {
    appStore.gotoPath(path);
  }
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleClick();
    }
  }
</script>

<div
  class="flex items-center justify-center w-fit whitespace-nowrap text-fgs2 hover:text-fgs1"
>
  <!-- <div class="triangle bg-fgs2 w-[8px] h-[7px] mr-1" /> -->
  <p
    on:click={handleClick}
    on:keydown={handleKeyDown}
    id="breadcrumb-item-label"
    class={cn("text-b2 font-thin", {
      "opacity-50": isDisabled,
      "cursor-default": path === "",
      "cursor-pointer": path !== "",
      "text-ccs1": isLast,
      "hover:underline": !isLast
    })}
  >
    <TextWithHoverTooltip
      truncateLength={isCollapse ? undefined : truncateLength}
      text={isCollapse ? "・・" : label}
      tooltip={label}
    />
  </p>
  {#if !isLast}
    <div class="px-2 opacity-50">/</div>
  {/if}
</div>

<style>
  .triangle {
    clip-path: polygon(0% 50%, 100% 0%, 100% 100%);
  }
</style>
