<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import InlineErrorMessage from "@21n/elements/text/InlineErrorMessage.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  export let label: string | undefined = undefined;
  let isSaving = false;
  let errorMessage: string | undefined = undefined;

  function onSave() {
    if (!label) {
      errorMessage = "Collection name is required";
      return;
    }
    isSaving = true;
    dispatch("save", label);
  }
</script>

<div class="p-4 flex flex-col gap-1">
  <div class="flex items-center gap-2">
    <TextInput
      bind:value={label}
      size={Size.sm}
      placeholder="New collection name"
      on:enter={onSave}
    />
    <Button
      icon={isSaving ? "svg-spinners:3-dots-fade" : "save"}
      tooltip="Save collection"
      style={ButtonStyle.OUTLINED}
      on:click={onSave}
    />
  </div>
  {#if errorMessage}
    <InlineErrorMessage bind:error={errorMessage} />
  {/if}
</div>
