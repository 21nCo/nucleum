<script lang="ts">
  import "$lib/client/app.css";
  import ClipsPane from "$lib/client/extensions/clipper/sidePanel/clips/ClipsPane.svelte";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import { onDestroy, onMount } from "svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import {
    openAppPath,
    relayToContentScript
  } from "$lib/client/utils/extension.utils";
  import type { IClip } from "$lib/client/products/memotron/node/node.type";
  import ExtensionBaseLayer from "../../ExtensionBaseLayer.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { nodeStore } from "$lib/client/products/memotron/node/node.store";
  import { collectionStore } from "$lib/client/products/memotron/collection/collection.store";
  import { webpage } from "../contentScripts/store";
  import {
    linker,
    linkTagStore
  } from "$lib/client/products/memotron/linking/link.store";
  import account from "$lib/client/stores/account.store";
  import { resolveToken } from "$lib/client/utils/account.utils";
  import { getPort } from "@plasmohq/messaging/port";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import {
    loadInMemoryResourceStore,
    loadInMemoryStores
  } from "$lib/client/components/flux/fluxExtentionMediator";
  import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { screenShotOnlyPages } from "$lib/client/products/memotron/common/urlMap";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  let mode: "Clips" | "Capture" | "Notes" = "Clips";
  let title = "";
  let isPageSaved = false;
  let clips: IClip[] = [];
  let notes = "";
  let feedback = "";
  let isLoggedIn = false;
  let refreshId: number = new Date().getTime();
  let isNotAvailable = false;

  const channel = getPort("channel");
  const stores = [linkTagStore];
  async function onSavePageClick() {
    const page = await relayToContentScript({
      event: ClipperExtensionEvent.SAVE_WEBPAGE
    });
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.event === ExtensionEvent.PAGE_STATE) {
      refreshState(message.data);
      sendResponse({ status: "success", message: "State refreshed" });
    } else if (message.event === ClipperExtensionEvent.CLIPS_CHANGED) {
      //TODO testing
      logger.debug({ at: "onMessage - Clips changed", message });
      clips = message.data;
      sendResponse({ status: "success", message: "Clips updated" });
    } else if (message.event === ExtensionEvent.BOOTUP) {
      onBootup();
    } else if (message.event === ExtensionEvent.MUTATION) {
      console.log({ at: "SidePanel - RELOAD_INMEMORY_STORE", message });
      loadInMemoryStore(message.data?.resource);
    }
    return true;
  });

  function onChannelMessage(msg: any) {
    logger.log({ at: "SidePanel - channel listener", msg });
  }

  onMount(async () => {
    channel.onMessage.addListener(onChannelMessage);
    logger.log({ at: "onMount - SidePanel" });
    const tab = await chrome.storage.local.get("tab");
    title = tab.tab.title;
    const page = await relayToContentScript({
      event: ExtensionEvent.PAGE_STATE
    });
    refreshState(page);
    await onBootup();
  });

  onDestroy(() => {
    channel.onMessage.removeListener(onChannelMessage);
  });

  //TODO - maintain a store with the data.
  async function refreshState(data: any) {
    logger.debug({ at: "SidePanel - refreshState", data });
    if (!data) return;
    if (data.id) isPageSaved = true;
    else isPageSaved = false;
    if (data.clips) clips = data.clips;
    if (data.title) title = data.title;
    if (data.notes) notes = data.notes;
    else notes = "";
    if (data.url) {
      const unavailableUrlsList = [
        ...screenShotOnlyPages,
        /^https:\/\/(?:www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)\/?$/,
        /^https:\/\/(?:.*\.)?memotron\.io(?:\/.*)?$/
      ];
      isNotAvailable = unavailableUrlsList.some((x) => x.test(data.url));
    }
    const token = await resolveToken();
    if (token) {
      if (!$account) account.init();
      isLoggedIn = true;
    } else {
      isLoggedIn = false;
    }
    refreshId = new Date().getTime();
  }

  async function onNotesChange(e: CustomEvent) {
    feedback = "Saving...";
    const result = await relayToContentScript({
      event: ClipperExtensionEvent.MUTATION_RELAY,
      data: {
        action: "webpageNotes",
        notes
      }
    });
    setTimeout(() => {
      feedback = "Notes saved!";
    }, 1000);
  }

  async function loadInMemoryStore(resource: Resource) {
    logger.log({
      at: "SidePanel.loadInMemoryStore",
      resource
    });
    if (!resource) return;
    const store = stores.find((x) => x.id === resource);
    if (!store || !store.isInMemory || !store.loader) return;
    await loadInMemoryResourceStore(store);
  }

  async function onBootup() {
    logger.log({ at: "SidePanel - onBootup" });
    await loadInMemoryStores(stores);
  }
</script>

<!-- svelte-ignore missing-declaration -->
<ExtensionBaseLayer
  id="sidePanel"
  stores={[nodeStore, collectionStore, webpage, linker]}
>
  <div class="w-full h-screen">
    <div class="flex flex-col gap-4 w-full h-full bg-bgs1 text-b2 text-fgs1">
      {#if isLoggedIn && !isNotAvailable}
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
        <PanelSwitcher
          items={["Clips", "Notes"]}
          bind:value={mode}
          style={PanelSwitcherStyle.BAR}
          isExpandToFullWidth={true}
        >
          <div slot="right" class="flex text-b3 text-fgs2">
            {feedback}
          </div>
        </PanelSwitcher>
        <div class="flex w-full flex-1 overflow-y-auto">
          {#if mode === "Clips"}
            <div class="flex flex-col gap-2 p-4 h-full w-full">
              {#key clips}
                <ClipsPane {clips} />
              {/key}
            </div>
          {:else if mode === "Notes"}
            <div
              class="flex w-full justify-center bg-bgs2 rounded-md px-2 py-1"
            >
              {#if isPageSaved}
                {#key refreshId}
                  <InlineMarkdownTextInput
                    placeholder="Add notes"
                    bind:content={notes}
                    on:change={onNotesChange}
                  />
                {/key}
              {:else}
                <span> Save page to add notes. </span>
              {/if}
            </div>
          {:else}
            <!-- TODO -->
          {/if}
        </div>
      {:else if isNotAvailable}
        <div class="flex w-full flex-1">
          <ComingSoonView
            mainText="This page is not available on side panel yet"
            subText="We are working on it!"
            isHideRoadmap={true}
            style={2}
          />
        </div>
      {:else}
        <div class="flex w-full flex-1">
          <div
            class="flex flex-col h-full w-full justify-center items-center gap-4"
          >
            <span> Please login to continue. </span>
            <Button
              label="Login"
              type={ButtonVariant.PRIMARY}
              on:click={() => openAppPath("signup?ext=true")}
            />
          </div>
        </div>
      {/if}
      <footer
        class="h-12 border-t border-t-brs3 flex justify-between items-center px-3"
      >
        <Button
          label="Go to app"
          size={Size.sm}
          style={ButtonStyle.PLAIN}
          on:click={() => openAppPath("")}
        />
        {#if isLoggedIn}
          <span class="flex items-center gap-2">
            <span>
              {$account?.userInfo?.nickName ?? "Unknown user"}
            </span>
            <Button
              label="logout"
              size={Size.sm}
              isUnderlined={true}
              style={ButtonStyle.PLAIN}
              on:click={() => {
                account.signOut();
                clips = [];
                isPageSaved = false;
                relayToContentScript({
                  event: ExtensionEvent.LOGOUT
                });
              }}
            />
          </span>
        {:else if !isLoggedIn}
          <Button
            label="Login"
            size={Size.sm}
            style={ButtonStyle.PLAIN}
            on:click={() => openAppPath("signup?ext=true")}
          />
        {/if}
      </footer>
    </div>
  </div>
</ExtensionBaseLayer>
