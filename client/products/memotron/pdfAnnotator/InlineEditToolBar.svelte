<script lang="ts">
  import ColorPalette from "$lib/client/elements/colorPicker/colorPalette.svelte";
  import { createEventDispatcher } from "svelte";
  // export let colorPalate = ["#FF0000", "#FFA500", "#FFFF00"];
  export let style = "";
  export let InlineEditorVisible = false;
  export let selectedColor = "";
  export let editable = false;
  let dispatchEvent = createEventDispatcher();
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="flex text-lg h-6 material-symbols-rounded bg-bgs2 text-fgs1 rounded-md"
  {style}
  on:click|stopPropagation
  on:mousedown|stopPropagation
>
  <button
    class="text-fgs1 hover:bg-bgs4 px-1 rounded-md"
    on:click={() => {
      dispatchEvent("deleteClicked");
      InlineEditorVisible = false;
    }}
  >
    delete
  </button>
  {#if editable}
    <button
      class="text-fgs1 hover:bg-bgs4 px-1 rounded-md"
      on:click={() => {
        dispatchEvent("editClicked");
        InlineEditorVisible = false;
      }}
    >
      edit_note
    </button>
  {/if}
  <div style="border-left:1px solid gray"></div>
  <ColorPalette
    on:colorClicked
    bind:selectedColor
    bind:visible={InlineEditorVisible}
  />
</div>
