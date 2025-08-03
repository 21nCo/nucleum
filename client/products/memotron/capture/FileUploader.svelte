<script lang="ts">
  import { fileDrop } from "$lib/client/actions/fileDrop.action";
  import { logger } from "$lib/client/components/debug/logger.client";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import account from "$lib/client/stores/account.store";
  import { appStore } from "$lib/client/stores/app.store";
  import context from "$lib/client/stores/context.store";
  import view from "$lib/client/stores/view.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Embed } from "$lib/client/types/context.type";
  import { wait } from "$lib/client/utils/time.utils";
  import { MAX_FILE_SIZE_MB } from "../../../components/record/record.store";
  import { resolveFileUploadErrorMessage } from "../memotron.utils";
  import { MemotronAction } from "../memotronAction.enum";
  import type { NodeType } from "../node/node.type";
  import type { IMultiFileCaptureData } from "./capture.type";
  import { resolveMultipleFilesData } from "./capture.utils";
  import { createEventDispatcher } from "svelte";
  import { clipboard, type IActiveCaptureStore } from "./capture.store";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import { fly } from "svelte/transition";
  export let captureStore: IActiveCaptureStore;
  const dispatch = createEventDispatcher();

  const imageFileTypes = [
    ".jpg",
    ".png",
    ".jpeg",
    ".webp",
    ".gif",
    ".svg",
    ".heic"
  ];
  const videoFileTypes = [".mp4", ".mov"];
  const audioFileTypes = [".wav", ".mp3"];
  const pdfFileTypes = [".pdf"];

  const supportedFileTypes = [
    ...imageFileTypes,
    ...videoFileTypes,
    ...audioFileTypes,
    ...pdfFileTypes,
    ".md"
  ].join(",");

  let multipleFilesData: IMultiFileCaptureData | undefined = undefined;
  let error: string | undefined = undefined;

  let isValidMultipleFiles = false;
  const uploadProgressElementId = "node-embed-upload-progress";

  async function handleDrop(
    all: File[],
    valid: File[],
    errors: { file: File; type: string }[]
  ) {
    try {
      error = undefined;
      if (account.isCloudUserAndOffline()) {
        error =
          "You seem to be offline. File upload is not yet available in offline mode.";
        return;
      }
      if (errors && errors.length > 0) {
        error = resolveFileUploadErrorMessage(errors, {
          maxFileSizeMB: MAX_FILE_SIZE_MB
        });
        return;
      }
      if (all.length === 1) {
        let file = all[0];
        await captureStore.saveFile(file);
      } else if (all.length > 1) {
        multipleFilesData = resolveMultipleFilesData(all, MAX_FILE_SIZE_MB);
        if (multipleFilesData && multipleFilesData.sizeExceededCount > 0) {
          error = `${multipleFilesData.sizeExceededCount} files exceed the maximum size of ${MAX_FILE_SIZE_MB} MB.`;
        } else {
          isValidMultipleFiles = true;
        }
      }
    } catch (e: any) {
      logger.error({ at: "FileUploader.handleDrop", error: e });
      error = "Something went wrong";
    } finally {
      $captureStore.isSaving = false;
    }
  }

  async function saveAll(e: MouseEvent) {
    if (e) e.stopPropagation();
    if (!multipleFilesData) return;
    await wait(10);
    await captureStore.saveMultipleFiles(multipleFilesData.files, {
      uploadProgressId: uploadProgressElementId
    });
  }

  /**
   * Handles insert into markdown option
   *
   * Note: MemotronAction.CAPTURE_SECONDARY is used as fileUploader can be triggered either via global drag and drop (MemotronAction.CAPTURE_DND) or regular capture (MemotronAction.CAPTURE). Using .CAPTURE will not reload the capture as search param remains the same.
   */
  async function handleInsertIntoMd(e: MouseEvent) {
    if (e) e.stopPropagation();
    if (!multipleFilesData) return;
    clipboard.set({
      multipleFiles: multipleFilesData
    });
    appStore.runAction(MemotronAction.CAPTURE_SECONDARY, {
      searchParams: {
        [AppSearchParam.CLIPBOARD]: true
      },
      componentParams: {
        captureId: $captureStore.id
      }
    });
  }
</script>

<div
  class="w-full h-full flex flex-col items-center justify-center"
  in:fly={{ duration: 300, y: 100 }}
>
  {#if $captureStore.isSaving && !isValidMultipleFiles}
    <EmptyStatusView
      isLoadingState={true}
      loadingText="Processing and uploading..."
    />
  {:else}
    <div
      class="flex flex-col gap-6 w-full mo:h-9/10 h-full justify-between items-center border border-dashed border-brs3 bg-bgs2/50 rounded-md"
      use:fileDrop={{
        accept: supportedFileTypes,
        multiple: true,
        maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
        onDrop: handleDrop,
        dragOverClass: ["bg-bgs2/100", "border-fgs3"]
      }}
    >
      <div class="flex w-full justify-end p-3">
        <div>
          <Button
            icon="back"
            tooltip="Go back"
            parentBgIndex={2}
            on:click={() => dispatch("clear")}
          />
        </div>
      </div>
      <div class="flex flex-col items-center gap-6 w-full">
        <div class="flex flex-col items-center gap-2">
          {#if $captureStore.isSaving}
            <div class="flex items-center gap-1">
              <span class="text-fgs3 text-b3">Processing and uploading...</span>
              <span id={uploadProgressElementId} class="text-fgs3 text-b3"
              ></span>
            </div>
          {:else if isValidMultipleFiles && multipleFilesData}
            <div>
              {multipleFilesData.files.length} files selected
            </div>
          {:else}
            <div class="text-fgs1">
              {#if $context.embed === Embed.HANDSET}
                Browse files
              {:else}
                Drag and drop your files here
              {/if}
            </div>
            <div class="flex gap-3 items-center">
              <Icon icon="ph:image" class="stroke-fgs3" />
              <Icon icon="ph:music-note" class="stroke-fgs3" />
              <!-- <Icon icon="ph:video" class="stroke-fgs3" /> -->
              <Icon icon="ph:file-pdf" class="stroke-fgs3" />
            </div>
          {/if}
        </div>
        <div class="w-1/2">
          <Divider />
        </div>
        <div class="flex mo:flex-col gap-3">
          {#if isValidMultipleFiles}
            <Button
              label="Save all"
              isLoading={$captureStore.isSaving}
              type={ButtonVariant.PRIMARY}
              icon="proceed"
              parentBgIndex={2}
              on:click={saveAll}
            />
            <Button
              label="Insert into markdown"
              icon="markdown"
              parentBgIndex={2}
              on:click={handleInsertIntoMd}
            />
          {:else}
            <Button label="Select file" icon="upload" parentBgIndex={2} />
          {/if}
        </div>
        {#if error}
          <InlineErrorMessage {error} isDissappear={false} />
        {/if}
      </div>
      <div class="flex mo:flex-col text-fgs3 text-b3 gap-3 p-3">
        <span
          >Currently accepted file types: <b> image, audio, pdf, md </b>
        </span>
        {#if !$view.isConstrainedWidth}
          |
        {/if}
        <span>Max size per file: {MAX_FILE_SIZE_MB}MB</span>
      </div>
    </div>
  {/if}
</div>
