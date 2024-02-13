<script lang="ts">
  import DropdownArrowAccordion from "$lib/tidy/icons/DropdownArrowAccordion.svelte";
  import { AccordionState } from "$lib/tidy/types/accordionState.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import { AccordionIconRenderType } from "../types/accordionIconRenderType.enum";
  import ActiveBackgroundElement from "./Style/ActiveBackgroundElement.svelte";
  import Icon from "./Icon.svelte";
  import { Size } from "../types/size.enum";
  import { SelectionItemActiveStyle } from "../types/switcher.enum";
  import { windowObject } from "../stores/app.store";
  export let title: string;
  export let endContent: string | undefined;
  export let containerClassList: string = "";
  export let iconClassList: string = "";
  export let iconRenderType: AccordionIconRenderType | undefined =
    AccordionIconRenderType.VISIBLE;
  export let isActive: boolean = false;
  export let headerContent: string = "";
  export let color: number | undefined;
  export let nestingLevel: number = 0;
  const dispatch = createEventDispatcher();
  const iconButtonHoverStateClassList = "hover:bg-bgs3 hover:bg-opacity-20";

  let state: AccordionState = AccordionState.collapsed;

  function handleAccordionStateChange() {
    state =
      state === AccordionState.collapsed
        ? AccordionState.expanded
        : AccordionState.collapsed;
    dispatch("state-change", state);
  }
  function handleClickOnAccordionItem() {
    dispatch("click");
  }
</script>

<div
  class={`w-full flex items-center cursor-pointer flex-col justify-center ${containerClassList}`}
>
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <ActiveBackgroundElement
    on:click={handleClickOnAccordionItem}
    tabindex={0}
    {color}
    isBackgroundActive={isActive}
    classList="flex flex-col w-full items-center py-2 px-4"
    styles="padding-left: {nestingLevel * 1.5 ? nestingLevel * 1.5 : 0.5}rem"
  >
    <div class="flex w-full items-center gap-1">
      {#if iconRenderType !== AccordionIconRenderType.NOT_MOUNTED}
        <button
          on:keydown|stopPropagation
          on:click|stopPropagation={handleAccordionStateChange}
          class={`py-2 px-1 ${iconButtonHoverStateClassList} rounded-full ${
            iconRenderType === AccordionIconRenderType.VISIBLE
              ? `visible`
              : `invisible`
          } ${iconClassList}`}
        >
          <Icon
            icon={state === AccordionState.collapsed ? "chevright" : "chevdown"}
            size={Size.xs}
            {isActive}
            selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
            bgColorHue={color}
          />
          <!-- <DropdownArrowAccordion {isActive} width={20} {state} /> -->
        </button>
      {/if}
      <div class="text-start truncate w-56">
        {#if headerContent}
          {@html headerContent}
        {/if}
        <span class="">{title}</span>
      </div>

      {#if endContent}
        {@html endContent}
      {/if}
    </div>
  </ActiveBackgroundElement>
  {#if state === AccordionState.expanded}
    <slot />
  {/if}
</div>
