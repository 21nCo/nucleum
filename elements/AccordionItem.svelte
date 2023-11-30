<script lang="ts">
  import { windowObject } from "$lib/tidy/stores/app.store";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import DropdownArrow from "$lib/tidy/icons/DropdownArrow.svelte";
  import DropdownArrowAccordion from "$lib/tidy/icons/DropdownArrowAccordion.svelte";
  import Element from "$lib/tidy/elements/Element.svelte";
  import { AccordionState } from "$lib/tidy/types/accordionState.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import { AccordionIconRenderType } from "../types/accordionIconRenderType.enum";
  export let title: string;
  export let endContent: string | undefined;
  export let classList: string = "";
  export let containerClassList: string = "";
  export let iconClassList: string = "";
  export let iconRenderType: AccordionIconRenderType | undefined =
    AccordionIconRenderType.VISIBLE;
  export let containerStyle = "";
  export let style = "";
  export let isIconActive: boolean = false;
  export let headerContent: string = "";

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
  style={containerStyle}
  class={`w-full flex items-center cursor-pointer flex-col justify-center ${containerClassList}`}
>
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <div
    {style}
    tabindex="0"
    on:click={handleClickOnAccordionItem}
    on:keydown={(e) => {
      if (e.key === "Enter") {
        handleClickOnAccordionItem();
      }
    }}
    class={`flex flex-col w-full items-center ${
      headerContent ? `py-1 px-4` : `py-3 px-4`
    } ${classList}`}
  >
    <div class={`flex w-full items-center gap-1 ${classList}`}>
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
          <DropdownArrowAccordion isActive={isIconActive} width={20} {state} />
        </button>
      {/if}
      <div class="truncate w-56">
        {#if headerContent}
          {@html headerContent}
        {/if}
        <span class="">{title}</span>
      </div>

      {#if endContent}
        {@html endContent}
      {/if}
    </div>
  </div>
  {#if state === AccordionState.expanded}
    <slot />
  {/if}
</div>
