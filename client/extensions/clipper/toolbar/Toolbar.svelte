<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import HightlightColorItem from "../HightlightColorItem.svelte";
  import { ClipperPersistence } from "../clipper.persistence";
  import { extractFullTabData } from "$lib/client/utils/extension.utils";
  import { ClipperExtensionEvent } from "$lib/client/types/memotron/clip.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
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

<!-- TODO - tooltip rendering incorrectly -->
<div
  class="fixed right-0 top-1/2 mr-3 2k:mr-6 transform -translate-y-1/2 bg-bgs1 border border-brs3 rounded-full w-9 min-h-fit 2k:w-10 flex flex-col gap-2 space-y-1.5 py-3 justify-center items-center shadow-md"
>
  {#if page?.id}
    <Button icon="check-circle" on:click={onsaveWebpageClick} />
  {:else}
    <Button icon="plus" on:click={onsaveWebpageClick} tooltip="Save page" />
  {/if}
  <Button icon="cube-transparent" tooltip="Snip" />
  <Button icon="document-text" tooltip="Generate summary" />
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
  <Button
    icon="cross-circled"
    tooltip="Collapse toolbar"
    on:click={() => {
      activeColor = null;
      dispatch("color", 0);
      dispatch("collapse");
    }}
  />
</div>
