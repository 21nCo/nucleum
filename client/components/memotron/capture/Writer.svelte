<script lang="ts">
  import { captureStore } from "$lib/client/components/memotron/capture/capture.store";
  import { CaptureType } from "$lib/client/types/memotron/capture.type";
  import Markdown from "$lib/client/components/markdown/Markdown.svelte";
  import { isEmptyMd } from "$lib/client/components/markdown/markdown.utils";
  import AudioCapture from "./AudioCapture.svelte";
  export let isEmptyState: boolean = true;
  refreshEmptyState();
  let isShowTOC: boolean = false;
  function onFileChanges(event: any) {
    captureStore.setFile(event.detail);
  }
  function refreshEmptyState() {
    isEmptyState =
      $captureStore.captureType === CaptureType.MARKDOWN &&
      "blocks" in $captureStore.body &&
      isEmptyMd($captureStore.body);
  }
  function onBlockChanges(event: any) {
    console.log("onBlockChanges", { event, body: $captureStore.body });
  }
  function onBlockInsert(event: any) {
    console.log("onBlockInsert", { event, body: $captureStore.body });
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
    <div class="w-full h-full flex items-center justify-center text-fgs4">
      Browse files
    </div>
  {:else if "blocks" in $captureStore.body}
    <div class="overflow-auto h-full w-full dp:px-10">
      <Markdown
        bind:md={$captureStore.body}
        params={{
          isNodular: true,
          placeholder: "Start typing or choose a type to get started...",
          canUseSlashShortcut: true,
          isReadOnly: false
        }}
        on:blocks={refreshEmptyState}
        on:change={onBlockChanges}
        on:insert={onBlockInsert}
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
