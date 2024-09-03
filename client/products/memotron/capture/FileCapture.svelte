<script lang="ts">
  import UploadButton from "$lib/client/elements/button/UploadButton.svelte";
  import account from "$lib/client/stores/account.store";
  import { generateUID } from "$lib/client/utils/utils";
  import { createEventDispatcher, onMount } from "svelte";
  import AudioScrubablePreview from "./AudioScrubablePreview.svelte";
  import { captureStore } from "./capture.store";
  import PdfAnnotator from "../pdfAnnotator/PdfAnnotator.svelte";
  import InlineLoadingAnimation from "$lib/client/elements/feedback/animations/InlineLoadingAnimation.svelte";
  let isUploading: boolean = false;
  let isDraggedIn = false;
  let fileCaptureContainer: HTMLDivElement;
  let item: {
    name: string;
    data: Blob;
    url: string;
    type: string;
    pdfAnnotations?: any[];
  } | null;
  $: console.log({ item });
  const dispatch = createEventDispatcher();
  /**
   * Used to show "Drop Here" feedback when a item is dragged into an empty column or grid.
   * Invoked on DragEnter
   * @param e
   * @param index
   */
  function highlight(e: Event) {
    preventDefault(e);
    isDraggedIn = true;
  }
  /**
   * Used to remove "Drop Here" feedback when a item is dropped or moved away from an empty column or grid.
   * Invoked on DragLeave
   * @param e
   * @param index
   */
  function unhighlight(e: any) {
    preventDefault(e);
    if (fileCaptureContainer.contains(e.relatedTarget)) return;
    isDraggedIn = false;
  }
  /**
   * Used to prevent the default behaviour when an item is dropped inside an element.
   * The default behaviour is to open the image in a new tab.
   * @param e
   */
  function preventDefault(e: any) {
    e.preventDefault();
    e.stopPropagation();
  }
  async function handleFileUpload(e: any) {
    isUploading = true;
    let dt = e?.dataTransfer;
    let file;
    let newURL;
    let fileName;
    let blob;
    if (dt?.files[0]) file = dt.files[0];
    else if (e?.target?.files[0]) file = e.target.files[0];
    [newURL, fileName, blob] = await account.tempUploadToS3(file);
    let fileDetails = {
      name: fileName,
      data: blob,
      url: newURL,
      type: file.type,
      size: file.size,
      pdfAnnotations: []
    };
    dispatch("change", fileDetails);
    item = fileDetails;
    isUploading = false;
  }
  onMount(() => {
    console.log("Capture store", $captureStore);
    if ($captureStore.fileDetails) {
      item = $captureStore.fileDetails;
    }
  });
</script>

<div
  class="relative border border-pink-900 h-full flex flex-col items-center justify-center text-fgs4 flex-grow pt-2"
  bind:this={fileCaptureContainer}
  on:dragover={preventDefault}
  on:drop={preventDefault}
  on:dragenter={highlight}
  on:dragleave={unhighlight}
>
  {#if item}
    {#if item.type.startsWith("image/")}
      <img alt="..." src={item.url} />
    {:else if item.type.startsWith("video/")}
      <video controls>
        <source src={item.url} />
        <track kind="captions" />
      </video>
    {:else if item.type.startsWith("audio/")}
      <AudioScrubablePreview url={item.url} />
    {:else if item.type.startsWith("application/pdf")}
      <PdfAnnotator url={item.url} isReplaceable={true} />
    {/if}
  {:else if isUploading}
    <div class="text-h2 m-2">Uploading Please wait...</div>
    <div class="flex justify-center h-2/10 w-2/10">
      <InlineLoadingAnimation variant="bg-background" />
    </div>
  {:else if isDraggedIn}
    <div
      class="absolute text-h1 text-fgs3 w-full h-full bg-opacity-50 bg-bgs2 border border-dashed flex items-center justify-center"
      on:drop={handleFileUpload}
    >
      <span>Drop Here</span>
    </div>
  {:else}
    <div class="text-h1">Drop Here</div>
    <div class="text-h2">(or)</div>
    <UploadButton
      accept="image/*,audio/*,video/*,application/pdf"
      on:input={handleFileUpload}
    />
  {/if}
</div>
