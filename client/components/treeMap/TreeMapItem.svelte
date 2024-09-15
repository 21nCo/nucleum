<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import type { TreeMapContent } from "$lib/client/types/treeMap.type";
  import view from "$lib/client/stores/view.store";
  import { createEventDispatcher } from "svelte";
  import TextWithHoverTooltip from "$lib/client/elements/text/TextWithHoverTooltip.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { ResourceAccessMode } from "../resourceStores/resource.type";
  import { page } from "$app/stores";
  const dispatch = createEventDispatcher();
  export let id: string;
  export let contentCallback: (id: string) => TreeMapContent;
  export let childrenCallback: (id: string) => string[];
  export let nestingLevel: number = 0;
  let content: TreeMapContent | undefined = undefined;
  let children: string[] = [];
  let isCollapsed = true;
  $: if (id) {
    content = contentCallback(id);
  }
  $: if (id) {
    children = childrenCallback(id);
  }
  function onclick(e: MouseEvent) {
    if (!$view.isPortrait) isCollapsed = !isCollapsed;
    e.stopPropagation();
    dispatch("click", id);
  }
  function onchevclick(e: MouseEvent) {
    if (!$view.isPortrait) return;
    isCollapsed = !isCollapsed;
    e.stopPropagation();
  }
  $: currentInlineResource = $page.url.searchParams.get(
    ResourceAccessMode.INLINE
  );
  $: isActive = currentInlineResource === id;
</script>

{#if content}
  <button on:click={onclick} class="relative flex flex-col w-full">
    <CustomColorPropagator
      color={content.color}
      class={cn("flex gap-4 w-full p-3 mo:py-4", {
        "bg-ccs1": isActive
      })}
      style="padding-left: {nestingLevel ? nestingLevel * 2.5 : 0.8}rem"
    >
      <span class="flex gap-2 text-left w-full min-w-0 flex-1">
        {#if content.icon}
          <Icon
            icon={content.icon}
            class={cn({
              "fill-ccs1": isActive,
              "stroke-fgs1": !isActive
            })}
          />
        {:else if children.length > 0}
          <Icon
            icon={isCollapsed ? "chevright" : "chevdown"}
            class={cn({
              "stroke-cbg": isActive,
              "stroke-fgs1": !isActive
            })}
            on:click={onchevclick}
          />
        {/if}
        <TextWithHoverTooltip text={content.label} class="truncate" />
      </span>
      <span class="shrink-0">
        {#if content.icon && children.length > 0}
          <Icon
            icon={isCollapsed ? "chevright" : "chevdown"}
            class={cn({
              "stroke-cbg": isActive,
              "stroke-fgs1": !isActive
            })}
          />
        {:else if children.length > 0}
          <span class="text-b4 text-fgs2 bg-bgs2 rounded-md px-2 py-0.5">
            {children.length}
          </span>
        {/if}
      </span>
    </CustomColorPropagator>
    <div class="w-full">
      {#if children.length > 0 && !isCollapsed && children}
        {#each children as child}
          <svelte:self
            id={child}
            {contentCallback}
            {childrenCallback}
            nestingLevel={nestingLevel + 1}
            on:click
          />
        {/each}
      {/if}
    </div>
  </button>
{/if}
