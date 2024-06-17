<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import type { TreeMapContent } from "$lib/client/types/treeMap.type";
  import view from "$lib/client/stores/view.store";

  import { createEventDispatcher } from "svelte";
  import ActiveBackgroundElement from "$lib/client/elements/style/ActiveBackgroundElement.svelte";
  import { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import TextWithHoverTooltip from "$lib/client/elements/text/TextWithHoverTooltip.svelte";
  import { determineTruncateLength } from "$lib/client/utils/text.utils";
  import { Size } from "$lib/client/types/size.enum";
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
  $: if (!isCollapsed && id) {
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
  $: console.log("view current path", $appStore.currentPath);
  $: isActive = $appStore.currentPath.includes(id);
</script>

{#if content}
  <button on:click={onclick} class="flex flex-col w-full">
    <ActiveBackgroundElement
      color={content.color}
      isBackgroundActive={isActive}
      class="flex justify-between w-full py-3 px-3"
      styles="padding-left: {nestingLevel ? nestingLevel * 2.5 : 0.8}rem"
    >
      <span class="flex gap-2 text-left">
        {#if content.icon}
          <Icon
            icon={content.icon}
            bgColorHue={content.color}
            {isActive}
            selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
          />
        {:else if content.childrenCount > 0}
          <Icon
            icon={isCollapsed ? "chevright" : "chevdown"}
            bgColorHue={content.color}
            {isActive}
            selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
            on:click={onchevclick}
          />
        {/if}
        <TextWithHoverTooltip
          text={content.label}
          truncateLength={determineTruncateLength(
            $view.display,
            nestingLevel ? Size.md : Size.lg
          )}
        />
      </span>
      {#if content.icon && content.childrenCount > 0}
        <Icon
          icon={isCollapsed ? "chevright" : "chevdown"}
          bgColorHue={content.color}
          {isActive}
          selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
        />
      {:else if content.childrenCount > 0}
        <span class="text-b4 text-fgs2 bg-bgs2 rounded-md px-2 py-0.5">
          {content.childrenCount}
        </span>
      {/if}
    </ActiveBackgroundElement>
    <div class="w-full">
      {#if content.childrenCount > 0 && !isCollapsed && children}
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
