<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import Element from "../Element.svelte";
  export let item: string | undefined = undefined;
  export let size: Size;
  export let parentBackgroundIndex: number;
  export let isActive: boolean = false;
  export let isDisabled: boolean = false;
  export let activeColor: string | undefined = undefined;
  export let selectionStyle: SelectionItemActiveStyle;
  let classList: string = "relative max-w-full";

  const dispatch = createEventDispatcher();
  function handleClick() {
    dispatch("click", { item });
  }
  onMount(() => {
    switch (size) {
      case Size.sm:
        classList += " py-1 px-4 text-b2 rounded-full";
        break;
      case Size.md:
        classList += " px-4 py-2 text-base";
        break;
      case Size.lg:
        //todo - add roman and medium font variants and use those instead of bold
        classList += " px-8 py-4 text-lg font-bold";
        break;
      default:
        classList += " p-2";
        break;
    }
  });
</script>

<Element
  {classList}
  on:click={handleClick}
  {parentBackgroundIndex}
  {selectionStyle}
  {isActive}
  {activeColor}
  {isDisabled}
>
  <div class="flex gap-2 items-center">
    {#if selectionStyle === SelectionItemActiveStyle.CIRCLE}
      <div class="relative rounded-lg outline outline-2 outline-fgs2 w-4 h-4">
        {#if isActive}
          <div class="absolute w-2 h-2 left-1/4 top-1/4 bg-fgs2 rounded-full" />
        {/if}
      </div>
    {/if}
    <div class="truncate text-left">
      {#if item}
        {item}
      {:else}
        <slot />
      {/if}
    </div>
  </div>
</Element>
