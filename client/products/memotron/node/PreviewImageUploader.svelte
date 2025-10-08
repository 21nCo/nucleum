<script lang="ts">
  import { fileDrop } from "$lib/client/actions/fileDrop.action";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { fileStore } from "$lib/client/components/files/file.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import Modal from "$lib/client/components/modal/Modal.svelte";
  import account from "$lib/client/stores/account.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { MAX_FILE_SIZE_MB } from "$lib/client/components/record/record.store";
  import { createEventDispatcher } from "svelte";
  import { nodeStore } from "./node.store";

  export let isOpen: boolean = false;
  export let nodeId: IRecordId;

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

  let selectedFile: File | undefined = undefined;
  let error: string | undefined = undefined;
  let isSaving: boolean = false;
  let previewUrl: string | undefined = undefined;

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
        error = "Please select a valid image file.";
        return;
      }
      if (all.length > 0) {
        selectedFile = all[0];
        previewUrl = URL.createObjectURL(selectedFile);
      }
    } catch (e: any) {
      logger.error({ at: "PreviewImageUploader.handleDrop", error: e });
      error = "Something went wrong";
    }
  }

  async function handleSave() {
    if (!selectedFile) {
      error = "Please select an image file";
      return;
    }

    try {
      isSaving = true;
      error = undefined;

      // Upload the file
      const fileResult = await fileStore.create([
        {
          file: selectedFile,
          label: selectedFile.name,
          name: selectedFile.name,
          type: selectedFile.type
        }
      ]);

      if (fileResult && fileResult.length > 0) {
        const fileId = fileResult[0].id;
        
        // Update the node with the preview image
        await nodeStore.modify(nodeId, {
          previewImage: fileId
        });

        dispatch("saved");
        handleClose();
      } else {
        error = "Failed to upload image";
      }
    } catch (e: any) {
      logger.error({ at: "PreviewImageUploader.handleSave", error: e });
      error = "Failed to save preview image";
    } finally {
      isSaving = false;
    }
  }

  function handleClose() {
    isOpen = false;
    selectedFile = undefined;
    previewUrl = undefined;
    error = undefined;
    dispatch("close");
  }

  function handleRemovePreview() {
    selectedFile = undefined;
    previewUrl = undefined;
  }
</script>

{#if isOpen}
  <Modal on:close={handleClose}>
    <div class="flex flex-col gap-4 p-6 w-full max-w-md">
      <div class="flex items-center justify-between">
        <h2 class="text-h4 text-fgs1">Set Custom Preview Image</h2>
        <Button icon="close" on:click={handleClose} parentBgIndex={1} />
      </div>

      {#if isSaving}
        <EmptyStatusView
          isLoadingState={true}
          loadingText="Uploading image..."
        />
      {:else}
        <div
          class="flex flex-col gap-4 w-full min-h-48 justify-center items-center border border-dashed border-brs3 bg-bgs2/50 rounded-md p-4"
          use:fileDrop={{
            accept: imageFileTypes.join(","),
            multiple: false,
            maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
            onDrop: handleDrop,
            dragOverClass: ["bg-bgs2/100", "border-fgs3"]
          }}
        >
          {#if previewUrl}
            <div class="flex flex-col gap-2 items-center w-full">
              <img
                src={previewUrl}
                alt="Preview"
                class="max-h-48 max-w-full object-contain rounded-md"
              />
              <Button
                label="Remove"
                icon="trash"
                on:click={handleRemovePreview}
                parentBgIndex={2}
              />
            </div>
          {:else}
            <div class="flex flex-col items-center gap-2">
              <Icon icon="ph:image" class="stroke-fgs3 w-12 h-12" />
              <div class="text-fgs1">Drag and drop your image here</div>
              <div class="text-fgs3 text-b3">or</div>
              <Button label="Select image" icon="upload" parentBgIndex={2} />
            </div>
          {/if}
        </div>

        {#if error}
          <InlineErrorMessage {error} isDissappear={false} />
        {/if}

        <div class="flex gap-2 justify-end">
          <Button label="Cancel" on:click={handleClose} parentBgIndex={1} />
          <Button
            label="Save"
            type={ButtonVariant.PRIMARY}
            on:click={handleSave}
            isDisabled={!selectedFile}
            parentBgIndex={1}
          />
        </div>

        <div class="text-fgs3 text-b3">
          Accepted file types: image (jpg, png, jpeg, webp, gif, svg, heic)
          <br />
          Max size: {MAX_FILE_SIZE_MB}MB
        </div>
      {/if}
    </div>
  </Modal>
{/if}
