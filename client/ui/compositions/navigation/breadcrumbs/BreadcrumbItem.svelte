<script lang="ts">
  import { tooltip } from "@21n/ui/actions/popover.action";
  import { cn } from "@21n/ui/environment/presentation";
  let {
    label = "",
    isDisabled = false,
    isLast = false,
    isOverflowItem = false,
    isShrinkable = false,
    onClick = undefined
  }: {
    label?: string;
    isDisabled?: boolean;
    isLast?: boolean;
    isOverflowItem?: boolean;
    /**
     * Whether the item shrinks with its container instead of keeping its
     * natural width: the label truncates down to a minimum width that keeps a
     * few characters visible, and the separator keeps its width.
     */
    isShrinkable?: boolean;
    onClick?: ((event: MouseEvent | KeyboardEvent) => void) | undefined;
  } = $props();

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      onClick?.(e);
    }
  }
</script>

<div
  class={cn("items-center", {
    flex: !isShrinkable || isLast || isOverflowItem,
    "grid grid-cols-[minmax(2rem,max-content)_auto]":
      isShrinkable && !isLast && !isOverflowItem,
    "w-full": isOverflowItem,
    "flex-shrink-0": !isLast && !isOverflowItem && !isShrinkable,
    "min-w-0 w-full": isLast && !isOverflowItem
  })}
>
  <button
    onclick={onClick}
    onkeydown={handleKeyDown}
    id="breadcrumb-item-label"
    class={cn("cursor-pointer text-b2 truncate text-left", {
      "opacity-50 cursor-not-allowed": isDisabled,
      "text-ccs1 w-full": isLast,
      "max-w-[150px]": !isLast && !isOverflowItem,
      "hover:underline": !isLast && !isOverflowItem,
      "hover:bg-bgs3 rounded-md p-2 w-full": isOverflowItem
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
