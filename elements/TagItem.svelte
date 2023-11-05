<script lang="ts">
  import { SvelteComponent, createEventDispatcher, onMount } from "svelte";
  import Icon from "./Icon.svelte";
  import { IconVariant } from "../types/icon.type";
  import { SelectionItemActiveStyle } from "../types/switcher.enum";

  export let label: string;
  export let id: string;
  export let classList: string = "";

  export let icon: string | undefined = "";

  export let activeClassList: string = "";
  export let inActiveClassList: string = ""; // this is done because, if we have some classes which are going to be changing depending on the active state, and if we put their initial value in classList, then we won't be able to override it later
  export let disabledClassList: string = "";

  export let isActive: boolean = false;
  export let style: string = "";
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher();

  function handleTagClick(e: any) {
    if (disabled) return;
    dispatch("click", { label, id });
  }
</script>

<button
  {style}
  tabindex="0"
  on:click={handleTagClick}
  class={`w-fit flex items-center justify-center gap-1 whitespace-nowrap ${classList} ${
    disabled
      ? `${disabledClassList} cursor-not-allowed`
      : isActive
      ? activeClassList
      : inActiveClassList
  }`}
>
  {#if icon}
    <div class="min-w-[1rem] mr-2 flex justify-center items-center w-4 h-4">
      <Icon
        selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
        {isActive}
        {icon}
        variant={IconVariant.Outline}
      />
    </div>
  {/if}
  {label}
</button>
