<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  import {
    ContextMenuType,
    type IContextMenuItem
  } from "$lib/client/types/select.type";
  import ContextMenuItemBase from "./ContextMenuItemBase.svelte";
  import ContextMenuItemWithSecondary from "./ContextMenuItemWithSecondary.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  export let item: IContextMenuItem;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let onSelect: (item: IContextMenuItem) => void = () => {};
  let contextMenuItemRef: any;
</script>

{#if item.secondStepComponent?.component}
  <ContextMenuItemWithSecondary {item} {size} on:select on:action />
{:else}
  <button
    class={cn(
      "flex items-center gap-2.5 justify-between hover:bg-bgs3 rounded-md",
      {
        "p-1.5": size === Size.sm,
        "p-2": size === Size.md,
        "px-3 py-2": size === Size.lg
      }
    )}
    on:click={(e) => {
      if (item.type === ContextMenuType.SWITCH) {
        if (contextMenuItemRef) contextMenuItemRef.toggle();
        return;
      }
      if (item.callback) item.callback();
      else if (item.action) appStore.runAction(item.action);
      onSelect(item);
      e.stopPropagation();
    }}
  >
    <ContextMenuItemBase
      {item}
      bind:this={contextMenuItemRef}
      on:change={(e) => {
        if (item.callback) item.callback(e.detail);
      }}
    />
  </button>
{/if}
