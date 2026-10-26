<svelte:options runes={true} />

<script lang="ts">
  import { cn } from "@21n/ui/environment/presentation";
  import { LayoutContext } from "@nucleum/shell/layout-mode.type";
  import AppMenuSwitcherItem from "@nucleum/shell/leftPanel/appMenuSwitcher/AppMenuSwitcherItem.svelte";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  let {
    items,
    layoutContext,
    parentBackgroundIndex,
    onClick
  }: {
    items: IAction[];
    layoutContext: LayoutContext;
    parentBackgroundIndex: number;
    onClick?: (item: IAction) => void;
  } = $props();
</script>

<div
  class={cn("flex flex-col", {
    "gap-2 items-center": layoutContext === LayoutContext.THIN_WITH_LABEL,
    "gap-1": layoutContext !== LayoutContext.THIN_WITH_LABEL,
    "px-1":
      $appStore.currentComponent?.panel &&
      layoutContext !== LayoutContext.THIN_WITH_LABEL
  })}
>
  {#each items as item (item.action)}
    <AppMenuSwitcherItem
      {parentBackgroundIndex}
      {layoutContext}
      {item}
      onClick={() => onClick?.(item)}
    />
  {/each}
</div>
