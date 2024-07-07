<script lang="ts">
  import "$lib/client/app.css";
  import ClipsPane from "$lib/client/extensions/clipper/sidePanel/clips/ClipsPane.svelte";
  import { ClipperPersistence } from "$lib/client/extensions/clipper/clipper.persistence";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import { ClipperExtensionEvent } from "$lib/client/types/memotron/clip.type";
  import { onMount } from "svelte";
  let mode: "clips" | "capture" = "clips";
  let title = "";
  let isPageSaved = false;
  async function onSavePageClick() {
    const result = await new ClipperPersistence().saveWebpage();
    if (result) {
      isPageSaved = true;
    }
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
      message.event === ExtensionEvent.TAB_CHANGE ||
      message.event === ExtensionEvent.TAB_UPDATE
    ) {
      title = message.tab?.title;
      isPageSaved = false;
    } else if (message.event === ClipperExtensionEvent.PAGE_SAVING_STATUS) {
      isPageSaved = message.node;
    }
  });
  onMount(async () => {
    const tab = await chrome.storage.local.get("tab");
    title = tab.tab.title;
    const node = await chrome.storage.local.get("node");
    isPageSaved = node.node;
  });
</script>

<div class="cs_tidigit_light_blue w-full h-screen" style="font-family: Avenir;">
  <div class="flex flex-col gap-4 w-full h-full bg-bgs1 text-b2 text-fgs1">
    <header
      class="flex w-full justify-between items-center p-3 border-b border-brs3 shadow-sm"
    >
      <span class=" max-w-8/12 truncate">{title}</span>
      <span>
        {#if isPageSaved}
          <div
            class="min-w-fit bg-bgs2 border rounded-md px-3 py-1.5 border-brs3"
          >
            Saved
          </div>
        {:else}
          <button
            class="min-w-fit bg-aps1 text-bgs1 px-3 py-1.5 rounded-md"
            on:click={onSavePageClick}
          >
            Save page</button
          >
        {/if}
      </span>
    </header>
    {#if mode === "clips"}
      <ClipsPane />
    {:else}
      <!-- TODO -->
    {/if}
  </div>
</div>
