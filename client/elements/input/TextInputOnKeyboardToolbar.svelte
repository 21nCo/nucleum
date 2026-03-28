<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";
  import KeyboardToolbar from "@21n/elements/keyboardToolbar/KeyboardToolbar.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { InputStyle } from "@21n/types/input.type";
  export let value: string = "";
  const dispatch = createEventDispatcher();
  let inputRef: TextInput;

  export async function focus() {
    await tick();
    inputRef?.focus();
  }

  function onCancel() {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
    dispatch("cancel");
  }
</script>

<KeyboardToolbar
  class="bg-bgs2 h-14 px-4 flex items-center justify-between"
  zIndex={80}
>
  <div class="flex items-center justify-center gap-2 flex-1 pr-3">
    <TextInput
      bind:this={inputRef}
      bind:value
      isPreventKeyboardToolbar={true}
      style={InputStyle.PLAIN}
      on:debouncedChange
      on:mount
    />
  </div>
  <div class="flex items-center justify-center gap-2">
    <Button
      icon="save"
      parentBgIndex={2}
      style={ButtonStyle.OUTLINED}
      type={ButtonVariant.PRIMARY}
      isPreventMinWidth={true}
      on:click={() => {
        dispatch("save");
      }}
      on:mousedown={(e) => e.preventDefault()}
    />
    <Button
      icon="cross"
      parentBgIndex={2}
      style={ButtonStyle.OUTLINED}
      isPreventMinWidth={true}
      on:click={onCancel}
    />
  </div>
</KeyboardToolbar>
