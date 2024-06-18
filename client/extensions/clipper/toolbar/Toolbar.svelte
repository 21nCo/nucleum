<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import HightlightColorItem from "../HightlightColorItem.svelte";
  import { ClipperPersistence } from "../clipper.persistence";
  import { extractFullTabData } from "$lib/client/utils/extension.utils";
  import { ClipperExtensionEvent } from "$lib/client/types/memotron/clip.type";
  // import Button from "$lib/client/elements/button/Button.svelte";
  const dispatch = createEventDispatcher();
  export let colors: string[] = [];
  export let page: any;
  export let activeColor: string | null = null;
  async function onsaveWebpageClick() {
    const data = extractFullTabData();
    await new ClipperPersistence().saveWebpage(data);
    dispatch("refresh");
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
      message.event === ClipperExtensionEvent.PAGE_SAVING_STATUS &&
      message.node
    ) {
      page = { id: message.node };
    }
  });
</script>

<div
  class="fixed right-0 top-1/2 mr-3 2k:mr-6 transform -translate-y-1/2 bg-bgs1 border border-brs3 rounded-full w-9 min-h-fit 2k:w-10 flex flex-col gap-2 space-y-1.5 py-3 justify-center items-center shadow-md"
>
  <!-- {#if page?.id}
    <span class="text-aps1 font-bold px-4">✅</span>
  {:else}
    <button on:click={onsaveWebpageClick}> + </button>
  {/if} -->
  <!-- <Button icon="clock" /> -->
  <!-- sample button -->
  <div>
    <svg
      width="17"
      height="18"
      viewBox="0 0 17 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.84519 1.5V4.26316M10.5557 13.7368H5.51186C4.59138 13.7368 3.84519 12.9907 3.84519 12.0702V4.26316M3.84519 4.26316H1.08203M6.21361 4.26316H11.6522C12.5727 4.26316 13.3189 5.00935 13.3189 5.92982V13.7368M13.3189 16.5V13.7368M13.3189 13.7368H16.4768"
        stroke="#545454"
        stroke-width="1.04167"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
  <div class="flex flex-col gap-2 w-full items-center justify-center">
    {#each colors as color}
      <HightlightColorItem
        {color}
        isActive={color === activeColor}
        on:click={() => {
          // console.log(color);
          activeColor = color;
          dispatch("color", color);
        }}
      />
    {/each}
  </div>
  <button
    style="border: 1px transparent solid; background-color: transparent; font-size: 20px;"
    on:click={() => {
      activeColor = null;
      dispatch("color", 0);
      dispatch("collapse");
    }}
  >
    x
  </button>
</div>
