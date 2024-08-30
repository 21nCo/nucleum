<script lang="ts">
  import "$lib/client/app.css";
  import ClipsPane from "$lib/client/extensions/clipper/sidePanel/clips/ClipsPane.svelte";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import { onMount } from "svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import {
    openAppPath,
    relayToContentScript
  } from "$lib/client/utils/extension.utils";
  import type { IClip } from "$lib/client/products/memotron/node/node.type";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ExtensionBaseLayer from "../../ExtensionBaseLayer.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle } from "$lib/client/types/button.type";
  let mode: "clips" | "capture" = "clips";
  let title = "";
  let isPageSaved = false;
  let clips: IClip[] = [];
  async function onSavePageClick() {
    const page = await relayToContentScript({
      event: ClipperExtensionEvent.SAVE_WEBPAGE
    });
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
      message.event === ExtensionEvent.TAB_CHANGE ||
      message.event === ExtensionEvent.TAB_UPDATE
    ) {
      title = message.tab?.title;
      isPageSaved = false;
    } else if (message.event === ExtensionEvent.PAGE_STATE) {
      refreshState(message.data);
    } else if (message.event === ClipperExtensionEvent.CLIPS_CHANGED) {
      //TODO testing
      logger.debug({ at: "onMessage - Clips changed", message });
      clips = message.data;
    }
  });
  onMount(async () => {
    logger.debug({ at: "onMount - SidePanel" });
    const tab = await chrome.storage.local.get("tab");
    title = tab.tab.title;
    const page = await relayToContentScript({
      event: ExtensionEvent.PAGE_STATE
    });
    refreshState(page);
  });

  //TODO - maintain a store with the data.
  function refreshState(data: any) {
    logger.debug({ at: "refreshState", data });
    if (data.id) isPageSaved = true;
    if (data.clips) clips = data.clips;
  }
</script>

<ExtensionBaseLayer id="sidePanel">
  <div class="w-full h-screen">
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
        <div class="flex flex-col gap-2 p-4 flex-grow">
          <Text content="Clips" style={TextStyle.SECTION_HEADING} />
          {#key clips}
            <ClipsPane {clips} />
          {/key}
        </div>
      {:else}
        <!-- TODO -->
      {/if}
      <footer
        class="h-12 border-t border-t-brs3 flex justify-center items-center"
      >
        <Button
          label="Go to app"
          size={Size.sm}
          style={ButtonStyle.PLAIN}
          on:click={() => openAppPath("")}
        />
      </footer>
    </div>
  </div>
</ExtensionBaseLayer>
