<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import view from "$lib/client/stores/view.store";
  import { createEventDispatcher } from "svelte";
  import TextWithHoverTooltip from "$lib/client/elements/text/TextWithHoverTooltip.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { NestedListStyle, type NestedItemContent } from "./nestedList.type";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { isSameResource } from "../flux/resourceStores/resource.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { tooltip } from "$lib/client/actions/popover.action";
  const dispatch = createEventDispatcher();
  export let id: string;
  export let index: number;
  export let totalLength: number;
  export let contentCallback: (id: string) => Promise<NestedItemContent>;
  export let childrenCallback: (id: string) => Promise<string[]>;
  export let nestingLevel: number = 0;
  export let style: NestedListStyle = NestedListStyle.DEFAULT;
  export let isExpandOnClickAnywhere: boolean = false;
  export let isShowAddTextInput: boolean = false;
  export let isActive: boolean = false;
  export let expandedItem: IRecordId | undefined = undefined;
  let addTextInputValue: string = "";
  let content: NestedItemContent | undefined = undefined;
  let children: string[] = [];
  let isCollapsed = true;
  let isIconHovering = false;
  $: if (id) {
    refreshContentAndChildren(id);
  }

  async function refreshContentAndChildren(id: string) {
    content = await contentCallback(id);
    children = (await childrenCallback(id)) ?? [];
  }

  function onclick(e: MouseEvent) {
    if (isExpandOnClickAnywhere) {
      if (!$view.isPortrait) isCollapsed = !isCollapsed;
    }
    e.stopPropagation();
    dispatch("click", id);
  }
  function onchevclick(e: MouseEvent) {
    isCollapsed = !isCollapsed;
    if (!isCollapsed) dispatch("expand", id);
    e.stopPropagation();
  }
  function onAddSub(e: any) {
    dispatch("addSub", {
      id,
      label: addTextInputValue,
      subTasks: children
    });
    addTextInputValue = "";
    setTimeout(() => {
      refreshContentAndChildren(id);
    }, 500);
  }
</script>

{#if content}
  <button on:click={onclick} class="relative flex flex-col w-full">
    <CustomColorPropagator
      color={content.color}
      class={cn("flex gap-4 w-full p-3 justify-center mo:py-4", {
        "bg-ccs1": isActive,
        "notouch:hover:bg-bgs2 active:bg-bgs2": !isActive,
        "rounded-t-md": index === 0,
        "rounded-b-md": index === totalLength - 1
      })}
      style="padding-left: {nestingLevel ? nestingLevel * 2.5 : 0.8}rem"
    >
      <span
        class="flex items-center gap-2 text-left w-full min-w-0 flex-1"
        use:hoverable={{
          onHover: (val) => {
            isIconHovering = val;
          }
        }}
      >
        <span
          class={cn("flex items-center justify-center rounded-md p-1", {
            "hover:bg-bgs3": children?.length > 0
          })}
        >
          {#if content.icon && (!isIconHovering || children?.length < 1)}
            <Icon
              icon={content.icon}
              class={cn({
                "fill-ccs1": isActive,
                "stroke-fgs1": !isActive
              })}
            />
          {:else if children?.length > 0}
            <Icon
              icon={isCollapsed
                ? "ph:caret-right-light"
                : "ph:caret-down-light"}
              class={cn({
                "stroke-cbg": isActive,
                "stroke-fgs1": !isActive
              })}
              on:click={onchevclick}
            />
          {/if}
        </span>
        <span
          class="flex-1"
          use:tooltip={{
            isEnableOnlyOnTruncate: true
          }}
        >
          {content.label}
        </span>
        <!-- <TextWithHoverTooltip text={content.label} class="truncate" /> -->
      </span>
      <span class="shrink-0">
        {#if children.length > 0}
          <span class="text-b3 text-fgs2 bg-bgs2 rounded-md px-2 py-0.5">
            {children.length}
          </span>
        {/if}
      </span>
    </CustomColorPropagator>
    <div class="w-full">
      {#if children?.length > 0 && !isCollapsed && children}
        {#each children as child}
          <svelte:self
            id={child}
            {contentCallback}
            {childrenCallback}
            {isShowAddTextInput}
            {expandedItem}
            nestingLevel={nestingLevel + 1}
            on:click
            on:expand
          />
        {/each}
      {/if}
    </div>
    {#if expandedItem && isSameResource(expandedItem, id) && !isCollapsed && isShowAddTextInput}
      <div
        class="flex w-full h-12"
        style="padding-left: {((nestingLevel ?? 0) + 1) * 2.5}rem"
      >
        <button
          class="px--4 py-3 w-full"
          on:click={(e) => {
            e.stopPropagation();
          }}
        >
          <TextInput
            bind:value={addTextInputValue}
            style={InputStyle.PLAIN}
            icon="ph:plus-light"
            placeholder="Add new item"
            isShowSaveControl={addTextInputValue !== ""}
            on:save={onAddSub}
            on:enter={onAddSub}
          />
        </button>
      </div>
    {/if}
  </button>
{/if}
