<script lang="ts">
  import type { IProperty } from "$lib/client/types/memotron/type.type";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { TextStyle } from "$lib/client/types/text.enum";
  import Memocon from "../common/Memocon.svelte";
  import PropertiesEditor from "./PropertiesEditor.svelte";
  import { typeStore } from "./type.store";
  let avatar: any;
  let label: string;
  let errMsg: string;
  let isCreationInProgress: boolean = false;
  let properties: IProperty[] = [];
</script>

<div class="flex flex-col items-start gap-4 w-full h-full bg-bgs1 p-8">
  <Text content="Create a new type" style={TextStyle.PAGE_HEADING} />
  <div class="flex gap-2 w-full">
    <Memocon bind:avatar />
    <TextInput bind:value={label} placeholder="Name for the type" />
  </div>
  <div class="w-full flex flex-col gap-2 items-start flex-grow">
    <Text content="Properties" style={TextStyle.SECTION_HEADING} />
    <div class="w-full flex-grow">
      <PropertiesEditor bind:properties />
    </div>
  </div>
  <footer class="flex flex-col w-full pb-8 gap-2">
    {#if errMsg}
      <InlineErrorMessage bind:error={errMsg} />
    {/if}
    <div class="flex w-full justify-center gap-4">
      <Button
        style={ButtonStyle.OUTLINED}
        on:click={() => {
          modalEvent.hide();
        }}>Discard</Button
      >
      <Button
        isLoading={isCreationInProgress}
        type="primary"
        on:click={async () => {
          isCreationInProgress = true;
          await typeStore.create({
            label,
            avatar,
            properties
          });
          isCreationInProgress = false;
          if (!errMsg) modalEvent.hide();
        }}
        label="Save"
      />
    </div>
  </footer>
</div>
