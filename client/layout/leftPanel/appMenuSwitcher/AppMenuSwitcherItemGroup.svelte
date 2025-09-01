<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { LayoutContext } from "$lib/client/types/layout.type";
  import AppMenuSwitcherItem from "./AppMenuSwitcherItem.svelte";
  import type { IAction } from "$lib/client/types/action.type";
  import { createEventDispatcher } from "svelte";
  import { appStore } from "$lib/client/stores/app.store";
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
