<script lang="ts">
  import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
  import { CaptureType } from "$lib/client/products/memotron/capture/capture.type";
  import AudioCapture from "./AudioCapture.svelte";
  import NodularMarkdown from "$lib/client/components/markdown/NodularMarkdown.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  export let captureType: CaptureType = CaptureType.MARKDOWN;
  export let isEmptyState: boolean = true;
  export let isSaveInProgress: boolean = false;
  import { setContext } from "svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import CameraCapture from "./CameraCapture.svelte";

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
          isFirstAndEmpty || isEmptyState ? "Start typing..." : undefined
      };
    },
    publish: handleEvent
  };

  setContext("content", contentContext);

  export function focus(id?: IRecordId) {
    mdRef?.focusBlock(id);
  }

  let isShowTOC: boolean = false;
</script>

<div class="flex w-full h-full max-h-full justify-between">
  {#if captureType === CaptureType.AUDIO}
    <div class="w-full h-full flex items-center justify-center">
      <AudioCapture bind:isSaveInProgress on:cancel />
    </div>
  {:else if captureType === CaptureType.CAMERA}
    <div class="w-full h-full flex items-center justify-center text-fgs4">
      <CameraCapture on:cancel />
    </div>
  {:else if "blocks" in $captureStore.body}
    <div class="overflow-auto h-full w-full dp:px--10">
      <!-- TODO - check if on syncdown the kv:capture is reloaded in the background - whether this is automatically updated - if not subscribe to syncDown from ComponentBaseLayer and refresh -->
      <NodularMarkdown
        isNodular={true}
        mdId={$captureStore.id}
        bind:md={$captureStore.body}
        bind:childrenWithStructure={$captureStore.childrenWithStructure}
        bind:rootStructure={$captureStore.rootStructure}
        bind:this={mdRef}
        on:change
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
  {/if}
</div>
