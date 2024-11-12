<script lang="ts">
  import { fileDrop } from "$lib/client/actions/fileDrop.action";
  import { logger } from "$lib/client/components/debug/logger.client";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import context from "$lib/client/stores/context.store";
  import view from "$lib/client/stores/view.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Embed } from "$lib/client/types/context.type";
  import { MAX_FILE_SIZE_MB } from "../memotron.store";
  import { resolveFileUploadErrorMessage } from "../memotron.utils";
  import type { NodeType } from "../node/node.type";
  import { captureStore } from "./capture.store";
  import { resolveMultipleFilesData } from "./capture.utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  const imageFileTypes = [".jpg", ".png", ".jpeg", ".webp", ".gif", ".svg"];
  const videoFileTypes = [".mp4", ".mov"];
  const audioFileTypes = [".wav", ".mp3"];
  const pdfFileTypes = [".pdf"];

  const supportedFileTypes = [
    ...imageFileTypes,
    ...videoFileTypes,
    ...audioFileTypes,
    ...pdfFileTypes
  ].join(",");

  let multipleFilesData:
    | {
        files: { file: File; contentType: NodeType }[];
        incompatibleFormats: string[];
        totalCount: number;
      }
    | undefined = undefined;
  let isSaveInProgress: boolean = false;
  let error: string | undefined = undefined;

  let isValidMultipleFiles = false;

  async function handleDrop(
    all: File[],
    valid: File[],
    errors: { file: File; type: string }[]
  ) {
    try {
      error = undefined;
      if (errors && errors.length > 0) {
        error = resolveFileUploadErrorMessage(errors, {
          maxFileSizeMB: MAX_FILE_SIZE_MB
        });
        return;
      }
      if (all.length === 1) {
        isSaveInProgress = true;
        let file = all[0];
        const result = await captureStore.saveFile(file);
      } else if (all.length > 1) {
        multipleFilesData = resolveMultipleFilesData(all, MAX_FILE_SIZE_MB);
        if (
          multipleFilesData &&
          multipleFilesData.incompatibleFormats.length > 0
        ) {
          error = `The following formats are not supported: ${multipleFilesData.incompatibleFormats.join(
            ", "
          )}`;
        } else {
          isValidMultipleFiles = true;
        }
      }
    } catch (e) {
      logger.error(e);
      error = "Something went wrong";
    } finally {
      isSaveInProgress = false;
    }
  }

  async function saveAll(e: CustomEvent) {
    if (e.detail) e.detail.stopPropagation();
    if (!multipleFilesData) return;
    isSaveInProgress = true;
    await captureStore.saveMultipleFiles(multipleFilesData.files);
    isSaveInProgress = false;
  }
</script>

<div class="w-full h-full flex flex-col items-center justify-center">
  {#if isSaveInProgress && !isValidMultipleFiles}
    <EmptyStatusView
      isLoadingState={true}
      loadingText="Uploading and saving..."
    />
  {:else}
    <div
      class="flex flex-col gap-6 mo:w-9/10 w-4/5 mo:h-9/10 h-4/5 justify-between items-center border border-dashed border-brs3 bg-bgs2 bg-opacity-60 rounded-md"
      use:fileDrop={{
        accept: supportedFileTypes,
        multiple: true,
        maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
        onDrop: handleDrop,
        dragOverClass: ["bg-opacity-100", "border-fgs3"]
      }}
    >
      <div class="flex w-full justify-end p-3">
        <div>
          <Button
            icon="cross"
            tooltip="Cancel"
            parentBgIndex={2}
            on:click={() => dispatch("cancel")}
          />
        </div>
      </div>
      <div class="flex flex-col items-center gap-6 w-full">
        <div class="flex flex-col items-center gap-2">
          {#if isValidMultipleFiles && multipleFilesData}
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
              isLoading={isSaveInProgress}
              type={ButtonVariant.PRIMARY}
              icon="ph:arrow-right-light"
              parentBgIndex={2}
              on:click={saveAll}
            />
            <Button
              label="Insert into markdown"
              isDisabled={true}
              badge="soon"
              tooltip="Coming soon"
              icon="ph:markdown-logo-light"
              parentBgIndex={2}
            />
          {:else}
            <Button
              label="Select file"
              icon="ph:upload-light"
              parentBgIndex={2}
            />
          {/if}
        </div>
        {#if error}
          <InlineErrorMessage {error} isDissappear={false} />
        {/if}
      </div>
      <div class="flex mo:flex-col text-fgs3 text-b3 gap-3 p-3">
        <span>Currently accepted file types: <b> image, audio, pdf </b> </span>
        {#if !$view.isConstrainedWidth}
          |
        {/if}
        <span>Max size per file: 15MB</span>
      </div>
    </div>
  {/if}
</div>
