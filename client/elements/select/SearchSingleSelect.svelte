<script lang="ts">
  import Icon from "../Icon.svelte";
  import TextSearchInput from "../input/TextSearchInput.svelte";
  import { type InputLabel, InputStyle } from "$lib/client/types/input.type";
  import { createEventDispatcher } from "svelte";
  import FormControlLabelWrapper from "../text/formLabel/FormControlLabelWrapper.svelte";
  import { Size } from "$lib/client/types/size.enum";
  const dispatch = createEventDispatcher();
  export let selected: any = undefined;
  export let placeholder: string = "Start typing to select";
  export let searchStoreId: string | undefined = undefined;
  export let searchCallback: Function | undefined = undefined;
  export let label: InputLabel | undefined = undefined;
  export let size: Size.md | Size.sm = Size.md;
  let inputRef: any;
  let value: string = "";
</script>

<FormControlLabelWrapper props={label} {size}>
  {#if selected}
    <div
      class="flex justify-start w-full py-2 border border-bgs4 px-2 rounded-md"
    >
      <button
        class="flex justify-between items-center w-full"
        on:click={() => {
          selected = undefined;
          setTimeout(() => {
            inputRef.focus();
          }, 100);
        }}
      >
        {selected.label}
        <Icon icon="chevdown" />
      </button>
    </div>
  {:else}
    <TextSearchInput
      on:focus
      on:blur
      bind:this={inputRef}
      on:select={(e) => {
        console.log("select", e.detail);
        selected = e?.detail?.item;
        value = "";
        dispatch("select", selected);
      }}
      bind:value
      style={InputStyle.BORDERED}
      {placeholder}
      {searchStoreId}
      {searchCallback}
    />
  {/if}
</FormControlLabelWrapper>
