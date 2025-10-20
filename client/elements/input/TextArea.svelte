<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import view from "@21n/stores/view.store";
  import { InputStyle, type InputLabel } from "@21n/types/input.type";
  import InputBaseElement from "@21n/elements/InputBaseElement.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";
  import { debouncer } from "@21n/utils/utils";
  export let size: Size = Size.md;
  export let value: any;
  export let placeholder: string | undefined = undefined;
  export let label: InputLabel | undefined = undefined;
  export let style: InputStyle = InputStyle.BORDERED;
  export let rows: number = 5;
  export let resizable: boolean = true;
  export let changeCallback: (value: string) => void = () => {};
  export let debouncedChangeCallback: (value: string) => void = () => {};
  export let width: string = "w-full";
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
  const dispatch = createEventDispatcher();
  function onChange() {
    dispatch("change", value);
    changeCallback(value);
    debouncedChange();
  }

  const debouncedChange = debouncer(() => {
    dispatch("debouncedChange", value);
    debouncedChangeCallback(value);
  }, 1000);
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
</InputBaseElement>
