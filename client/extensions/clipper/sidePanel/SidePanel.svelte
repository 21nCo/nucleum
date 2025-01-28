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
  import { collectionStore } from "$lib/client/components/collection/collection.store";
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
  import {
    memotronUrlsList,
    sidePanelUnavailableUrlsList
  } from "$lib/client/products/memotron/common/urlMap";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  let mode: "Clips" | "Capture" | "Notes" = "Clips";
  let title = "";
  let isPageSaved = false;
  let clips: IClip[] = [];
  let notes = "";
  let feedback = "";
  let isLoggedIn = false;
  let refreshId: number = new Date().getTime();
  let isNotAvailable = false;
  let isMemotronPage = false;

  const channel = getPort("channel");
  const stores = [linkTagStore];
  async function onSavePageClick() {
    const page = await relayToContentScript({
      event: ClipperExtensionEvent.SAVE_WEBPAGE
    });
  }
  const messageListener = (message: any, sender: any, sendResponse: any) => {
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
    } else if (message.event === ExtensionEvent.TOKEN_NOT_FOUND) {
      isLoggedIn = false;
    }
    return true;
  };

  function onChannelMessage(msg: any) {
    logger.log({ at: "SidePanel - channel listener", msg });
  }

  onMount(async () => {
    channel.onMessage.addListener(onChannelMessage);
    if (messageListener) {
      chrome.runtime.onMessage.addListener(messageListener);
    }
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
    if (messageListener) {
      chrome.runtime.onMessage.removeListener(messageListener);
    }
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
      isNotAvailable = sidePanelUnavailableUrlsList.some((x) =>
        x.test(data.url)
      );
      isMemotronPage = memotronUrlsList.some((x) => x.test(data.url));
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
                class="min-w-fit bg-bgs2 border rounded-md px-3 py-1.5 border-brs3 flex items-center gap-2"
              >
                <Icon icon="ph:check-light" size={Size.sm} />
                <span>Saved</span>
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
                <ClipsPane {clips} {isMemotronPage} />
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
          <EmptyStatusView
            mainText={isMemotronPage
              ? "Hello from the other side of Memotron👋."
              : "Clips cannot be shown here for this web page."}
            subText="Some web pages are not supported for clipping / showing clips in the side panel."
            isNotAvailableContext={true}
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
              icon="ph:sign-in-light"
              type={ButtonVariant.PRIMARY}
              on:click={() => openAppPath("signup?ext=true")}
            />
          </div>
        </div>
      {/if}
      <footer
        class="h-14 border-t border-t-brs3 flex justify-between items-center px-3"
      >
        <span class="flex items-center gap-2">
          <Button
            tooltip="Help and support"
            icon="ph:question-light"
            size={Size.sm}
            style={ButtonStyle.OUTLINED}
            on:click={() => {
              window.open("https://discord.com/invite/9HJqKYTZKg", "_blank");
            }}
          />
          <Button
            tooltip="Go to app"
            icon="ph:hexagon-light"
            size={Size.sm}
            style={ButtonStyle.OUTLINED}
            on:click={() => openAppPath("")}
          />
          {#if isLoggedIn}
            <Button
              tooltip="logout"
              icon="ph:sign-out-light"
              size={Size.sm}
              type={ButtonVariant.DANGER}
              style={ButtonStyle.OUTLINED}
              on:click={() => {
                account.signOut();
                clips = [];
                isPageSaved = false;
                relayToContentScript({
                  event: ExtensionEvent.LOGOUT
                });
                isLoggedIn = false;
              }}
            />
          {:else if !isLoggedIn}
            <Button
              tooltip="Login"
              icon="ph:sign-in-light"
              type={ButtonVariant.PRIMARY}
              size={Size.sm}
              style={ButtonStyle.OUTLINED}
              on:click={() => openAppPath("signup?ext=true")}
            />
          {/if}
        </span>
        {#if isLoggedIn}
          <span>
            {$account?.userInfo?.nickName ?? "Unknown user"}
          </span>
        {:else}
          <span> Not logged in. </span>
        {/if}
      </footer>
    </div>
  </div>
</ExtensionBaseLayer>
