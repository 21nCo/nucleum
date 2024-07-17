<script lang="ts">
  import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
  import { CaptureType } from "$lib/client/types/memotron/capture.type";
  import { isEmptyMd } from "$lib/client/components/markdown/markdown.utils";
  import AudioCapture from "./AudioCapture.svelte";
  import NodularMarkdown from "$lib/client/components/markdown/NodularMarkdown.svelte";
  import FileCapture from "./FileCapture.svelte";
  export let isEmptyState: boolean = true;
  refreshEmptyState();
  let isShowTOC: boolean = false;
  function onFileChanges(event: any) {
    captureStore.setFile(event.detail);
  }
  function refreshEmptyState(e?: CustomEvent) {
    isEmptyState =
      $captureStore.captureType === CaptureType.MARKDOWN &&
      "blocks" in $captureStore.body &&
      isEmptyMd(e?.detail || $captureStore.body);
  }
  function onMention(e: CustomEvent) {
    const detail = e.detail;
    if (!detail.id || !detail.location) return;
    captureStore.addMentionLink(detail.location, detail.id);
  }
  function onUnmention(e: CustomEvent) {
    const detail = e.detail;
    if (!detail.id || !detail.location) return;
    captureStore.removeMentionLink(detail.location, detail.id);
  }
</script>

<div class="flex w-full h-full max-h-full justify-between">
  {#if $captureStore.captureType === CaptureType.AUDIO}
    <div class="w-full h-full flex items-center justify-center">
      <AudioCapture on:change={onFileChanges} />
    </div>
  {:else if $captureStore.captureType === CaptureType.CAMERA}
    <div class="w-full h-full flex items-center justify-center text-fgs4">
      Camera opens here if supported or browse files
    </div>
  {:else if $captureStore.captureType === CaptureType.UPLOAD}
    <FileCapture on:change={onFileChanges} />
  {:else if "blocks" in $captureStore.body}
    <div class="overflow-auto h-full w-full dp:px--10">
      <NodularMarkdown
        isNodular={true}
        mdId={$captureStore.id}
        bind:md={$captureStore.body}
        bind:childrenWithStructure={$captureStore.childrenWithStructure}
        bind:rootStructure={$captureStore.rootStructure}
        on:change={refreshEmptyState}
        on:mention={onMention}
        on:unmention={onUnmention}
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
