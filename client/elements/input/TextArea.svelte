<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import view from "$lib/client/stores/view.store";
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import InputBaseElement from "../InputBaseElement.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  export let size: Size = Size.md;
  export let value: any;
  export let placeholder: string | undefined = undefined;
  export let label: InputLabel | undefined = undefined;
  export let style: InputStyle = InputStyle.BORDERED;
  export let isEnableSaveFeedback: boolean = false;
  export let rows: number = 5;
  export let resizable: boolean = true;
  export let changeCallback: (value: string) => void = () => {};
  export let width: string = "w-full";
  let isShowSaveFeedback: boolean = false;
  let isFocused: boolean = false;
  export function focus() {
    if (inputRef) inputRef.focus();
  }
  export function blur() {
    if (inputRef) inputRef.blur();
  }
  export function reset() {
    value = "";
  }
  let inputRef: any;
  export let isDisabled = false;
  let inputClasses: string =
    "text-input bg-transparent focus:outline-none focus:border-none";
  let changeTimer: any;
  let changeElaspsedTime: number = 0;
  const dispatch = createEventDispatcher();
  function onChange() {
    dispatch("input", { value });
    changeCallback(value);
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
</script>

<InputBaseElement {style} {label} {isFocused}>
  <textarea
    style="max-width:unset;"
    class={cn(width, inputClasses, {
      "resize-none": !resizable,
      "max-w-[unset]": $view.isPortrait,
      "text-b2": size === Size.sm
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
    on:paste|stopPropagation
    {placeholder}
    disabled={isDisabled}
    bind:this={inputRef}
  />
  {#if isEnableSaveFeedback && isShowSaveFeedback}
    <div class="absolute right-0 text-b2 text-fgs2">saved</div>
  {/if}
</InputBaseElement>
