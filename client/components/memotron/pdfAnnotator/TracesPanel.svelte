<script lang="ts">
  import { hexToRGBA } from "$lib/client/utils/pdfAnnotator.utils";
  import { userPreferences } from "$lib/client/stores/app.store";
  import { createEventDispatcher } from "svelte";
  let dispatchEvent = createEventDispatcher();
  // function hexToRGBA(hex: string, opacity: number) {
  //   let r = parseInt(hex.slice(1, 3), 16),
  //     g = parseInt(hex.slice(3, 5), 16),
  //     b = parseInt(hex.slice(5, 7), 16);

  //   return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  // }
</script>

<div
  class="absolute h-full w-3/12 bg-bgs1 right-0 border border-gray-400 overflow-scroll pb-2 text-fgs2"
>
  <div class="fixed w-full h-8 p-2 bg-bgs2 z-10"><button>All</button></div>
  <div class="px-2 mt-8">
    {#each $userPreferences.annotations as trace, index}
      <button
        class="block w-full text-left"
        on:click={() => {
          dispatchEvent("traceclicked", {
            id: trace.id,
            pageNumber: trace.pageNumber
          });
        }}
      >
        {#if trace.comment}
          <div
            class="w-full min-h-fit p-2 my-2 bg-bgs2 rounded-md text-sm text-fgs2"
          >
            {#if trace.selectedText}
              <blockquote
                class="border-l-2 border-orange-400 p-2 opacity-50 text-xs"
              >
                {trace.selectedText}
              </blockquote>{/if}
            {trace.comment}
          </div>
        {:else}
          <div
            class="w-full min-h-fit p-2 my-2 bg-bgs2 rounded-md text-xs text-fgs2"
            style="text-decoration: 2px {trace.annotType.toLowerCase()} {trace.color}; "
          >
            <span
              style={trace.annotType === "HIGHLIGHT"
                ? `background-color: ${hexToRGBA(trace.color, 0.2)};`
                : ""}
            >
              {trace.selectedText}</span
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
