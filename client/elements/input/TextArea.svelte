<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import view from "$lib/client/stores/view.store";
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import InputBaseElement from "../InputBaseElement.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IResource } from "$lib/client/components/resourceStores/resource.type";
  export let value: any;
  export let placeholder: string | undefined = undefined;
  export let label: InputLabel | undefined = undefined;
  export let style: InputStyle = InputStyle.BORDERED;
  export let size: Size = Size.md;
  export let isEnableSaveFeedback: boolean = false;
  export let rows: number = 5;
  export let resizable: boolean = true;
  let isShowSaveFeedback: boolean = false;
  let searchResults: IResource[] = [];
  let selectedIndex: number = 0;
  let isFocused: boolean = false;
  export function focus() {
    if (inputRef) inputRef.focus();
  }
  export function blur() {
    if (inputRef) inputRef.blur();
  }
  export function reset() {
    resetSearch();
    value = "";
  }
  let inputRef: any;
  export let isDisabled = false;
  let inputClasses: string =
    "text-input w-full bg-transparent focus:outline-none focus:border-none";
  let changeTimer: any;
  let changeElaspsedTime: number = 0;
  const dispatch = createEventDispatcher();
  function onChange() {
    dispatch("input", { value });
    isShowSaveFeedback = false;
    resetChangeTimer();
  }
  function resetChangeTimer() {
    changeElaspsedTime = 0;
    clearTimeout(changeTimer);
    changeTimer = setInterval(() => {
      changeElaspsedTime += 1;
    }, 1000);
  }
  $: {
    if (changeElaspsedTime > 1) {
      isShowSaveFeedback = true;
      setTimeout(() => {
        isShowSaveFeedback = false;
        changeElaspsedTime = 0;
        clearTimeout(changeTimer);
      }, 2000);
    }
  }

  function resetSearch() {
    searchResults = [];
    selectedIndex = 0;
  }
</script>

<InputBaseElement {style} {label} {isFocused}>
  <textarea
    style="max-width:unset;"
    class={cn("text-b2", inputClasses, {
      "resize-none": !resizable,
      "max-w-[unset]": $view.isPortrait
    })}
    {rows}
    bind:value
    on:change|stopPropagation
    on:keydown|stopPropagation
    on:keyup|stopPropagation
    on:blur={() => {
      isFocused = false;
      dispatch("blur");
    }}
    on:focus={() => {
      isFocused = true;
      dispatch("focus");
    }}
    on:input|stopPropagation={onChange}
    {placeholder}
    disabled={isDisabled}
    bind:this={inputRef}
  />
  {#if isEnableSaveFeedback && isShowSaveFeedback}
    <div class="absolute right-0 text-b2 text-fgs2">saved</div>
  {/if}
</InputBaseElement>
