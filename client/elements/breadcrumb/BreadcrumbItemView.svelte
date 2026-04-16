<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import TextWithHoverTooltip from "@21n/elements/text/TextWithHoverTooltip.svelte";
  let {
    label = "",
    isCollapse = false,
    isDisabled = false,
    isLast = false,
    truncateLength = undefined,
    isSubtleContext = false,
    onActivate = (_event: MouseEvent | KeyboardEvent) => {}
  }: {
    label?: string;
    isCollapse?: boolean;
    isDisabled?: boolean;
    isLast?: boolean;
    truncateLength?: number | undefined;
    isSubtleContext?: boolean;
    onActivate?: (event: MouseEvent | KeyboardEvent) => void;
  } = $props();

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      onActivate(e);
    }
  }
</script>

<div
  class={cn(
    "flex items-center justify-center w-fit whitespace-nowrap text-fgs2",
    {
      "hover:text-fgs1": !isSubtleContext
    }
  )}
>
  <button
    onclick={(event) => {
      onActivate(event);
    }}
    onkeydown={handleKeyDown}
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
</div>

<style>
  .triangle {
    clip-path: polygon(0% 50%, 100% 0%, 100% 100%);
  }
</style>
