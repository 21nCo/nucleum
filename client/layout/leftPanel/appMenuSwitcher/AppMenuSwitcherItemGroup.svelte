<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import { LayoutContext } from "@21n/types/layout.type";
  import AppMenuSwitcherItem from "@21n/layout/leftPanel/appMenuSwitcher/AppMenuSwitcherItem.svelte";
  import type { IAction } from "@21n/types/action.type";
  import { createEventDispatcher } from "svelte";
  import { appStore } from "@21n/stores/app.store";
  const dispatch = createEventDispatcher();
  export let items: IAction[];
  export let layoutContext: LayoutContext;
  export let parentBackgroundIndex: number;
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
      on:click={() => dispatch("click", item)}
    />
  {/each}
</div>
