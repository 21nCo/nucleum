<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import { createEventDispatcher, onMount, tick } from "svelte";
  import InlineMarkdownTextInput from "@21n/components/markdown/content/InlineMarkdownTextInput.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { InputStyle, type InputLabel } from "@21n/types/input.type";
  import InputBaseElement from "@21n/elements/InputBaseElement.svelte";
  import { isValidHyperlink } from "@21n/shared-utils/utils";
  import Link from "@21n/elements/text/Link.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { debouncer } from "@21n/utils/utils";
  import KeyboardToolbar from "@21n/elements/keyboardToolbar/KeyboardToolbar.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import context from "@21n/stores/context.store";
  import { OperatingSystem } from "@21n/types/context.type";
  import { mount } from "@21n/actions/mount.action";
  export let value: any;
  export let placeholder: string | undefined = undefined;
  export let label: InputLabel | undefined = undefined;
  export let style: InputStyle = InputStyle.BORDERED;
  export let size: Size = Size.md;
  export let parentBackgroundIndex: number = 1;
  export let type: string = "text";
  export let id: string = "";
  export let width: string | undefined = undefined;
  export let numberInputParams:
    | { min: number; max: number; step: number }
    | undefined = undefined;
  export let isExperimentalMdInput: boolean = false;
  export let icon: string | undefined = undefined;
  export let hasControls: boolean = false;
  export let isShowSaveControl: boolean = false;
  export let isShowClearControl: boolean = false;
  export let isPreventDefaultOnEnter: boolean = false;
  export let isRounded: boolean = false;
  export let height: string = style === InputStyle.PLAIN ? "" : "h-11";
  export let isPreventKeyboardToolbar: boolean = false;
  export let isPreserveKeyboardToolbar: boolean = false;
  export let isAccentBackground: boolean = false;
  let isFocused: boolean = false;
  export async function focus() {
    await tick();
    if (inputRef) inputRef.focus();
  }
  export function blur() {
    if (inputRef) inputRef.blur();
  }
  export function reset() {
    value = "";
  }
  let inputRef: any;
  let isValidLink: boolean = false;
  export let isDisabled = false;
  let inputClasses: string =
    "text-input w-full bg-transparent focus:outline-none focus:border-none";
  const dispatch = createEventDispatcher();

  $: isLinkType = type === "url" || type === "link" || type === "email";

  onMount(() => {
    inputClasses = inputClasses + " " + resolveStyles().join(" ");
    if (isLinkType) {
      isValidLink = isValidHyperlink(value);
    }
  });

  function resolveStyles() {
    let styles: string[] = [];
    // if (icon) {
    //   styles.push("pl-4");
    // }
    if (style != InputStyle.PLAIN) {
      styles.push("text-fgs2");
    }
    return styles;
  }
  function onChange() {
    dispatch("input", { value });
    dispatch("change", value);
    debouncedChangeEvent();
  }

  const debouncedChangeEvent = debouncer(
    () => dispatch("debouncedChange", value),
    1000
  );

  function handleKeyUp(event: any) {
    if (event.key === "Enter") {
      dispatch("enter", { value, event });
    } else if (event.key === "Escape") {
      inputRef.blur();
      dispatch("blur");
    }
    dispatch("keyup", { value, event });
  }
  function onBlur(e: any) {
    if (isLinkType) {
      isValidLink = isValidHyperlink(value);
    }
    if (isShowClearControl && e.relatedTarget?.id === "input-cancel-control")
      return;
    isFocused = false;
    dispatch("blur");
  }
</script>

{#if isExperimentalMdInput}
  <div class={inputClasses}>
    <InlineMarkdownTextInput
      {id}
      bind:content={value}
      {placeholder}
      on:keydown={(e) => {
        const event = e.detail;
        if (isPreventDefaultOnEnter && event.key === "Enter") {
          event.preventDefault();
          dispatch("enter", { event });
        } else {
          dispatch("keydown", event);
        }
      }}
      on:keyup
      on:focus
      on:blur
      on:change
      on:debouncedChange
      on:enter
      on:paste
    />
  </div>
{:else}
  <InputBaseElement
    {style}
    parentBgIndex={parentBackgroundIndex}
    {isFocused}
    {label}
    class={cn(height, { "!rounded-full": isRounded })}
  >
    {#if type === "password"}
      <input
        {id}
        class={inputClasses}
        bind:value
        on:change|stopPropagation
        on:keydown|stopPropagation
        on:keyup|stopPropagation
        on:paste|stopPropagation
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
        on:paste|stopPropagation
        on:blur={() => {
          isFocused = false;
          dispatch("blur");
        }}
        on:focus={() => {
          isFocused = true;
          dispatch("focus");
        }}
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
      {#if !isFocused && isLinkType && value}
        <div class="w-full truncate">
          <button
            class="text-fgs3 h-6 w-full flex gap-2 items-center justify-start"
            on:click={() => {
              isFocused = true;
              requestAnimationFrame(() => {
                inputRef?.focus();
              });
            }}
          >
            {#if isValidLink}
              <Icon
                icon={type === "email" ? "at" : "link"}
                size={Size.sm}
                class="stroke-fgs3"
              />
              <button
                class="min-w-0 w-3/4 max-w-fit truncate flex justify-start"
                on:click={(e) => e.stopPropagation()}
              >
                <Link
                  href={value}
                  label={value}
                  isEnforeHttpIfMatchPattern={true}
                />
              </button>
            {:else}
              {value}
            {/if}
          </button>
        </div>
      {:else}
        {#if icon}
          <Icon {icon} size={Size.sm} class="stroke-fgs3" />
        {/if}
        <input
          {id}
          class={cn(inputClasses, {
            "h-7": hasControls,
            "h-12 text-h3": size === Size.lg,
            "placeholder:text-bgs3 placeholder:opacity-70": isAccentBackground
          })}
          bind:value
          on:paste|stopPropagation
          on:change|stopPropagation
          on:keydown
          on:keyup|stopPropagation={handleKeyUp}
          on:blur={onBlur}
          on:focus={() => {
            isFocused = true;
            dispatch("focus");
          }}
          on:input|stopPropagation={onChange}
          {placeholder}
          disabled={isDisabled}
          bind:this={inputRef}
          autocomplete="off"
          tabindex={isDisabled ? -1 : 0}
          {...type ? { type } : {}}
          use:mount={() => {
            dispatch("mount");
          }}
        />
      {/if}
      <!-- {#if icon}
        <div class="absolute left-0 top-0 bottom-0 flex items-center px-1.5">
          <Icon {icon} size={Size.sm} class="stroke-fgs3" />
        </div>
      {/if} -->
      {#if isShowSaveControl || isShowClearControl}
        <div class="flex items-center gap-1">
          {#if isShowSaveControl}
            <Icon
              icon="check"
              id="input-save-control"
              on:click={(e) => dispatch("save", { event: e, value })}
            />
          {/if}
          {#if isShowSaveControl || isShowClearControl}
            <Icon
              icon="cross"
              id="input-cancel-control"
              on:click={(e) => {
                e.stopPropagation();
                dispatch("cancel", { event: e });
              }}
            />
          {/if}
        </div>
      {/if}
    {/if}
    <slot />
  </InputBaseElement>
{/if}
{#if isPreserveKeyboardToolbar || (!isPreventKeyboardToolbar && isFocused)}
  <KeyboardToolbar class="bg-bgs2 h-14 px-4 flex items-center justify-between">
    <div class="flex items-center justify-center gap-2">
      <!-- <Button
        icon="undo"
        parentBgIndex={2}
        on:click={() => {
          // TODO: undo
        }}
      />
      <Button
        icon="redo"
        parentBgIndex={2}
        on:click={() => {
          // TODO: redo
        }}
      /> -->
      <!-- <Button
        icon="copy"
        label="paste"
        size={Size.sm}
        parentBgIndex={2}
        style={ButtonStyle.DEFAULT}
        isPreventMinWidth={true}
        on:click={() => {
          // TODO: paste
        }}
        on:mousedown={(e) => e.preventDefault()}
      /> -->
    </div>
    <div class="flex items-center justify-center gap-2">
      <Button
        icon="cross"
        label="clear"
        parentBgIndex={2}
        size={Size.sm}
        style={ButtonStyle.DEFAULT}
        isPreventMinWidth={true}
        on:click={() => {
          inputRef.value = "";
          dispatch("cancel");
        }}
        on:mousedown={(e) => e.preventDefault()}
      />
      <Button
        icon="chevron-down"
        label="close"
        parentBgIndex={2}
        size={Size.sm}
        style={ButtonStyle.DEFAULT}
        isPreventMinWidth={true}
        on:click={() => {
          document.activeElement?.blur();
        }}
      />
    </div>
  </KeyboardToolbar>
{/if}
