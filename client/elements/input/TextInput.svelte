<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import Icon from "../Icon.svelte";
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import InputBaseElement from "../InputBaseElement.svelte";
  export let value: any;
  export let placeholder: string | undefined = undefined;
  export let label: InputLabel | undefined = undefined;
  export let style: InputStyle = InputStyle.BORDERED;
  export let size: Size = Size.md;
  export let parentBackgroundIndex: number = 1;
  export let isEnableSaveFeedback: boolean = false;
  export let type: string = "text";
  export let id: string = "";
  export let width: string | undefined = undefined;
  export let numberInputParams:
    | { min: number; max: number; step: number }
    | undefined = undefined;
  export let isExperimentalMdInput: boolean = false;
  export let icon: string | undefined = undefined;
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
    "text-input w-full bg-transparent focus:outline-none focus:border-none";
  let changeTimer: any;
  let changeElaspsedTime: number = 0;
  const dispatch = createEventDispatcher();
  onMount(() => {
    inputClasses = inputClasses + " " + resolveStyles().join(" ");
  });

  function resolveStyles() {
    let styles: string[] = [];
    if (icon) {
      styles.push("pl-8");
    }
    if (style != InputStyle.PLAIN) {
      styles.push("text-fgs2");
    }
    return styles;
  }
  function onChange() {
    dispatch("input", { value });
    dispatch("change", { value });
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
  function handleKeyUp(event: any) {
    if (event.key === "Enter") {
      dispatch("enter", { value });
    } else if (event.key === "Escape") {
      inputRef.blur();
      dispatch("blur");
    }
    dispatch("keyup", { value, event });
  }
</script>

{#if isExperimentalMdInput}
  <div class={inputClasses}>
    <InlineMarkdownTextInput
      bind:content={value}
      {placeholder}
      on:keydown
      on:keyup
      on:focus
      on:blur
    />
  </div>
{:else}
  <InputBaseElement {style} {isFocused} {label}>
    {#if type === "password"}
      <input
        {id}
        class={inputClasses}
        bind:value
        on:change|stopPropagation
        on:keydown|stopPropagation
        on:keyup|stopPropagation
        on:input|stopPropagation={onChange}
        type="password"
        on:blur={() => {
          isFocused = false;
          dispatch("blur");
        }}
        on:focus={() => {
          isFocused = true;
          dispatch("focus");
        }}
        {placeholder}
        disabled={isDisabled}
        bind:this={inputRef}
        autocomplete="off"
      />
    {:else if type === "number"}
      <input
        {id}
        class={inputClasses}
        bind:value
        on:change|stopPropagation
        on:keydown|stopPropagation
        on:keyup|stopPropagation
        on:blur
        on:focus
        on:input|stopPropagation={onChange}
        type="number"
        min={numberInputParams?.min}
        max={numberInputParams?.max}
        step={numberInputParams?.step}
        {placeholder}
        disabled={isDisabled}
        bind:this={inputRef}
      />
    {:else}
      <input
        {id}
        class={inputClasses}
        bind:value
        on:change|stopPropagation
        on:keydown
        on:keyup|stopPropagation={handleKeyUp}
        on:blur={() => {
          isFocused = false;
          dispatch("blur");
        }}
        on:focus={() => {
          isFocused = true;
          dispatch("focus");
        }}
        on:input|stopPropagation={onChange}
        type="text"
        {placeholder}
        disabled={isDisabled}
        bind:this={inputRef}
        autocomplete="off"
        tabindex={isDisabled ? -1 : 0}
      />
      {#if icon}
        <div class="absolute left-0 top-0 bottom-0 flex items-center px-1.5">
          <Icon {icon} size={Size.sm} />
        </div>
      {/if}
    {/if}
  </InputBaseElement>
{/if}
