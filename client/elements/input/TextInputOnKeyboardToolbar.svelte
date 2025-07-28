<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";
  import KeyboardToolbar from "../keyboardToolbar/KeyboardToolbar.svelte";
  import Button from "../button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import TextInput from "./TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  export let value: string = "";
  const dispatch = createEventDispatcher();
  let inputRef: TextInput;

  export async function focus() {
    await tick();
    inputRef?.focus();
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
      icon="floppy-disk"
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
      on:click={() => {
        //  inputRef.value = "";
        document.activeElement?.blur();
        dispatch("cancel");
      }}
    />
  </div>
</KeyboardToolbar>
