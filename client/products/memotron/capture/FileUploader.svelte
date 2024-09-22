<script lang="ts">
  import { fileDrop } from "$lib/client/actions/fileDrop.action";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { MemotronAction } from "../memotronAction.enum";
  import type { NodeType } from "../node/node.type";
  import { captureStore } from "./capture.store";
  import { resolveMultipleFilesData } from "./capture.utils";

  let multipleFilesData:
    | {
        files: { file: File; contentType: NodeType }[];
        incompatibleFormats: string[];
        totalCount: number;
      }
    | undefined = undefined;
  let isSaveInProgress: boolean = false;
  let error: string | undefined = undefined;
  const MAX_FILE_SIZE_MB = 15;
  let isValidMultipleFiles = false;

  async function handleDrop(
    all: File[],
    valid: File[],
    errors: { file: File; type: string }[]
  ) {
    try {
      error = undefined;
      if (errors && errors.length > 0) {
        onInvalid(errors);
        return;
      }
      if (all.length === 1) {
        isSaveInProgress = true;
        let file = all[0];
        const result = await captureStore.saveFile(file);
        postSave(result);
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
      error = "Something went wrong";
    } finally {
      isSaveInProgress = false;
    }
  }

  async function saveAll(e: CustomEvent) {
    if (e.detail) e.detail.stopPropagation();
    if (!multipleFilesData) return;
    isSaveInProgress = true;
    const result = await captureStore.saveMultipleFiles(
      multipleFilesData.files
    );
    postSave(result);
  }

  function postSave(result: any) {
    isSaveInProgress = false;
    if (!result || result.error) {
      error = result?.error ?? "Something went wrong";
      return;
    }
    if (multipleFilesData?.files && multipleFilesData.files.length > 1) {
      toasts.success(
        `${multipleFilesData.files.length} nodes saved successfully!`
      );
    } else {
      toasts.success("Node saved successfully!");
    }
    if (result.id) {
      appStore.openResource(result.id, ResourceAccessMode.POP);
    }
    captureStore.reset();
    modalEvent.hide(MemotronAction.CAPTURE);
  }

  function onInvalid(errors: { file: File; type: string }[]) {
    errors.forEach((err) => {
      error =
        (error ? error + ", " : "") + resolveErroLabel(err.file, err.type);
    });

    function resolveErroLabel(file: File, type: string) {
      let error = "";
      if (type === "type") {
        const extension = file.name.split(".").pop();
        error = `File type .${extension} not supported`;
      } else if (type === "size") {
        error = `File size exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB`;
      }
      return error;
    }
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
      class="flex flex-col gap-6 w-4/5 h-4/5 justify-between items-center border border-dashed border-brs3 bg-bgs2 bg-opacity-60 rounded-md"
      use:fileDrop={{
        accept: ".jpg,.png,.jpeg,.pdf,.wav,.mp3",
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
            on:click={() => {
              captureStore.reset();
            }}
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
            <div class="text-fgs1">Drag and drop your files here</div>
            <div class="flex gap-3 items-center">
              <Icon icon="ph:image" class="stroke-fgs3" />
              <Icon icon="ph:music-note" class="stroke-fgs3" />
              <Icon icon="ph:video" class="stroke-fgs3" />
              <Icon icon="ph:file-pdf" class="stroke-fgs3" />
            </div>
          {/if}
        </div>
        <div class="w-1/2">
          <Divider />
        </div>
        <div class="flex gap-3">
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
      <div class="flex gap-3 p-3">
        <!-- <span class="text-fgs3 text-b3"
      >Accepted formats: .jpg, .png, .pdf, .mp3, .mp4</span
    > -->
        <span class="text-fgs3 text-b3">Max size per file: 15MB</span>
      </div>
    </div>
  {/if}
</div>
