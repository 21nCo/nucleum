<script lang="ts">
  import ColorPalette from "$lib/client/elements/colorPicker/colorPalette.svelte";
  import { createEventDispatcher } from "svelte";

  // export let options = ["NOTES", "HIGHLIGHT", "UNDERLINE", "STRIKETHROUGH"];
  export let selectedColor = "#FF0000";
  export let style = "";
  export let inlineToolBarVisible = false;
  let dispatchEvent = createEventDispatcher();
</script>

<div
  class="flex justify-between text-lg h-6 material-symbols-rounded bg-bgs2 rounded-md"
  {style}
  on:mousedown|stopPropagation
>
  <button
    class="text-fgs1 hover:bg-bgs4 px-1 rounded-md"
    on:click={() => {
      dispatchEvent("annotate", "COMMENT");
      inlineToolBarVisible = false;
    }}
  >
    comment
  </button>
  <button
    class="text-fgs1 hover:bg-bgs4 px-1 rounded-md"
    on:click={() => {
      dispatchEvent("annotate", "HIGHLIGHT");
      inlineToolBarVisible = false;
    }}
  >
    ink_marker
  </button>
  <button
    class="text-fgs1 hover:bg-bgs4 px-1 rounded-md"
    on:click={() => {
      dispatchEvent("annotate", "LINE-THROUGH");
      inlineToolBarVisible = false;
    }}
  >
    strikethrough_s
  </button>
  <button
    class="text-fgs1 hover:bg-bgs4 px-1 rounded-md"
    on:click={() => {
      dispatchEvent("annotate", "UNDERLINE");
      inlineToolBarVisible = false;
    }}
  >
    format_underlined
  </button>
  <div style="border-left:1px solid gray"></div>
  <ColorPalette bind:selectedColor />
</div>
