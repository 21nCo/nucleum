<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";
  import {
    ContextMenuType,
    type IContextMenuItem
  } from "@21n/types/select.type";
  import ContextMenuItemBase from "@21n/elements/contextMenu/ContextMenuItemBase.svelte";
  import ContextMenuItemWithSecondary from "@21n/elements/contextMenu/ContextMenuItemWithSecondary.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { createEventDispatcher } from "svelte";
  import ContextMenuToggleItem from "@21n/elements/contextMenu/ContextMenuToggleItem.svelte";
  const dispatch = createEventDispatcher();
  export let item: IContextMenuItem;
  export let isToggleGroup = false;
  export let parentBgIndex = 1;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  let contextMenuItemRef: any;
</script>

{#if isToggleGroup}
  <ContextMenuToggleItem
    {item}
    {size}
    {parentBgIndex}
    on:change={(e) => {
      if (item.callback) item.callback(e.detail);
      dispatch("select", item);
    }}
  />
{:else if item.secondStepComponent?.component}
  <ContextMenuItemWithSecondary {item} {size} on:select on:action />
{:else}
  {@const isRedAccent = item.value?.toString()?.toLowerCase() === "delete"}
  <button
    class={cn(
      "contextmenuitem flex items-center gap-2.5 justify-between rounded-md truncate",
      {
        "p-1.5": size === Size.sm,
        "p-2": size === Size.md,
        "px-3 py-2": size === Size.lg,
        "notouch:hover:bg-bgs3-striped active:bg-bgs3-striped": !isRedAccent,
        "notouch:hover:bg-ars3 active:bg-ars3": isRedAccent
      }
    )}
    data-context-menu-item-id={item.value}
    on:click={(e) => {
      if (item.type === ContextMenuType.SWITCH) {
        if (contextMenuItemRef) contextMenuItemRef.toggle();
        return;
      }
      if (item.callback) item.callback();
      else if (item.action) appStore.runAction(item.action);
      dispatch("select", item);
      e.stopPropagation();
    }}
  >
    <ContextMenuItemBase
      {item}
      bind:this={contextMenuItemRef}
      {isRedAccent}
      on:change={(e) => {
        if (item.callback) item.callback(e.detail);
      }}
    />
  </button>
{/if}
