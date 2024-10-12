<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { hexToRGBA } from "$lib/client/products/memotron/pdfAnnotator/pdfAnnotator.utils";
  import { createEventDispatcher } from "svelte";
  let dispatchEvent = createEventDispatcher();
  // function hexToRGBA(hex: string, opacity: number) {
  //   let r = parseInt(hex.slice(1, 3), 16),
  //     g = parseInt(hex.slice(3, 5), 16),
  //     b = parseInt(hex.slice(5, 7), 16);

  //   return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  // }
  export let annots: any = [];
  export let handleAnnotDelete: (e: any, id: string) => void;
</script>

<div
  class="absolute h-full w-3/12 bg-bgs1 right-0 overflow-x-hidden overflow-y-hidden pb-2 text-fgs2"
>
  <div class="w-full h-8 p-2 bg-bgs2 z-10"><button>Notes</button></div>
  <div class="px-2 h-full mt-8 overflow-y-scroll">
    {#each annots as trace, index}
      <button
        class="block relative w-full my-2 text-left border border-red"
        on:click={() => {
          dispatchEvent("traceclicked", {
            id: trace.id,
            pageNumber: trace.pageNumber
          });
        }}
      >
        <button
          on:click|stopPropagation={() => handleAnnotDelete(null, trace.id)}
          class="absolute top-1 right-0 material-symbols-rounded text-base text-fgs4 hover:text-h4 hover:text-fgs2 z-40"
          >{@html "&#Xe92b"}</button
        >
        {#if trace.comment}
          <div
            class="w-full min-h-fit p-2 bg-bgs2 rounded-md text-sm text-fgs2"
          >
            {#if trace.selectedText}
              <blockquote
                class="border-l-2 border-orange-400 p-2 opacity-50 text-xs"
              >
                {trace.selectedText.slice(0, 100)}
              </blockquote>{/if}
            {trace.comment}
          </div>
        {:else}
          <div
            class="w-full min-h-fit p-2 bg-bgs2 rounded-md text-xs text-fgs2"
            style="text-decoration: 2px {trace.annotType?.toLowerCase()} {trace.color}; "
          >
            <span
              style={trace.annotType === "HIGHLIGHT"
                ? `background-color: ${hexToRGBA(trace.color, 0.2)};`
                : ""}
            >
              {trace.selectedText.slice(0, 100)}</span
            >
          </div>
        {/if}
      </button>
    {/each}
    <p class="w-full min-h-fit p-2 my-2 text-center text-xs text-fgs2">
      End of Traces
    </p>
  </div>
</div>
