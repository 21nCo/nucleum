<script lang="ts">
  import { CaptureMethod } from "@21n/products/memotron/capture/capture.type";
  import AudioCapture from "@21n/products/memotron/capture/AudioCapture.svelte";
  import NodularMarkdown from "@21n/components/markdown/NodularMarkdown.svelte";
  import { logger } from "@21n/components/debug/logger.client";

  import { setContext } from "svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import CameraCapture from "@21n/products/memotron/capture/CameraCapture.svelte";
  import { createEventDispatcher } from "svelte";
  import context from "@21n/stores/context.store";
  import type { IActiveCaptureStore } from "@21n/products/memotron/capture/capture.store";
  import { fly } from "svelte/transition";
  import PlayerControl from "@21n/elements/player/controls/PlayerControl.svelte";
  import { Size } from "@21n/types/size.enum";
  import { ButtonStyle } from "@21n/types/button.type";
  import { Context } from "@21n/types/appStore.type";
  const dispatch = createEventDispatcher();

  export let captureStore: IActiveCaptureStore;
  let mdRef: NodularMarkdown | undefined = undefined;

  function handleEvent(event: string, data: any) {
    logger.log({
      at: "capture handleEvent",
      event,
      data
    });
    if (event === "mention") {
      if (!data?.item || !data?.location) return;
      captureStore.addMentionLink("root", data.item, {
        location: data.location
      });
    } else if (event === "unmention") {
      if (!data?.id || !data?.location) return;
      captureStore.removeMentionLink("root", data.id);
    }
  }

  const contentContext = {
    resolveDynamicParams: (isFirstAndEmpty?: boolean) => {
      return {
        placeholder:
          isFirstAndEmpty || $captureStore.isEmpty
            ? "Start typing to capture..."
            : undefined
      };
    },
    publish: handleEvent
  };

  setContext(Context.CONTENT, contentContext);

  export function focus(id?: IRecordId) {
    mdRef?.focusBlock(id);
  }

  let isShowTOC: boolean = false;
</script>

<div
  class="flex w-full max-h-full h-full justify-between transition-all duration-250"
>
  {#if $captureStore.method === CaptureMethod.AUDIO}
    <div
      class="w-full h-full flex items-center justify-center"
      in:fly={{ y: 50, duration: 250 }}
    >
      <AudioCapture {captureStore} on:clear on:saved />
    </div>
  {:else if $captureStore.method === CaptureMethod.CAMERA}
    <div class="w-full h-full flex items-center justify-center">
      <CameraCapture {captureStore} on:clear on:saved />
    </div>
  {:else if $captureStore.body && "blocks" in $captureStore.body}
    <div class="overflow-auto h-full w-full dp:px--10" data-testid="capture-editor">
      <!-- TODO - check if on syncdown the kv:capture is reloaded in the background - whether this is automatically updated - if not subscribe to syncDown from ComponentBaseLayer and refresh -->
      <NodularMarkdown
        isNodular={true}
        mdId={$captureStore.id}
        bind:md={$captureStore.body}
        bind:childrenWithStructure={$captureStore.childrenWithStructure}
        bind:rootStructure={$captureStore.rootStructure}
        bind:this={mdRef}
        params={{ isPreventFocusOnLoad: $context.isTouchDevice }}
        on:change
        on:action={(e) => {
          dispatch("change", e.detail);
        }}
        on:restructure={(e) => {
          dispatch("change", e.detail);
        }}
      />
    </div>
    <!-- TODO - add condition for if headings present or if mentions present -->
    {#if isShowTOC}
      <aside class="w-72 flex flex-col h-full py-6 rounded-md items-center">
        <div class="flex flex-col flex-grow justify-center">
          <div class="text-fgs3 text-b3">
            <div class="text-b2">No headings.</div>
            Start typing to create one.
          </div>
        </div>
      </aside>
    {/if}
  {:else}
    <div class="pb-8">
      <PlayerControl
        on:click={() => {
          dispatch("clear");
        }}
        icon="back"
        tooltip="Go back"
        size={Size.sm}
        style={ButtonStyle.OUTLINED}
      />
    </div>
  {/if}
</div>
