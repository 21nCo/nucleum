<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import SwitcherBase from "./SwitcherBase.svelte";
  export let item: string | undefined = undefined;
  export let size: Size;
  export let parentBackgroundIndex: number;
  export let isActive: boolean = false;
  export let isDisabled: boolean = false;
  export let activeColor: number | undefined = undefined;
  export let selectionStyle: SelectionItemActiveStyle;
  export let width: string = "max-w-full";
  let classList: string =
    "relative rounded-md" + (isDisabled ? " opacity-50" : "") + ` ${width} `;

  const dispatch = createEventDispatcher();
  function handleClick() {
    dispatch("click", { item });
  }
  onMount(() => {
    switch (size) {
      case Size.sm:
        classList += " py-1 text-b2 rounded-full ";
        break;
      case Size.md:
        classList += " py-2 text-base ";
        break;
      case Size.lg:
        //todo - add roman and medium font variants and use those instead of bold
        classList += " px-2 py-4 text-lg font-medium ";
        break;
      default:
        classList += " p-2 ";
        break;
    }
    if (
      selectionStyle == SelectionItemActiveStyle.CIRCLE_WITH_BACKGROUND ||
      selectionStyle == SelectionItemActiveStyle.ACCENT_BACKGROUND
    ) {
      classList += " px-4 ";
    }
  });
</script>

<SwitcherBase
  {classList}
  on:click={handleClick}
  {parentBackgroundIndex}
  {selectionStyle}
  {isActive}
  {activeColor}
  {isDisabled}
>
  <div class="flex gap-2 items-center">
    {#if selectionStyle === SelectionItemActiveStyle.CIRCLE_WITH_BACKGROUND || selectionStyle === SelectionItemActiveStyle.CIRCLE}
      <div
        class="relative rounded-lg outline outline-2 outline-fgs2 w-4 h-4 min-w-[1rem]"
      >
        {#if isActive}
          <div class="absolute w-2 h-2 left-1/4 top-1/4 bg-fgs2 rounded-full" />
        {/if}
      </div>
    {/if}
    <div class="w-full truncate text-left">
      {#if item}
        {item}
      {:else}
        <slot />
      {/if}
    </div>
  </div>
</SwitcherBase>
