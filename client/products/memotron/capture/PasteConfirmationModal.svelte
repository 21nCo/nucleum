<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import CheckboxInput from "$lib/client/elements/toggle/CheckboxInput.svelte";
  import { resolveContentTypeForUrl } from "$lib/client/extensions/clipper/clipper.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { MemotronAction } from "../memotronAction.enum";
  import { NodeType } from "../node/node.type";
  import { resolveNodeContentLabel, resolveNodeIcon } from "../node/node.utils";
  import { captureStore } from "./capture.store";
  import {
    resolveContentTypeForFile,
    resolveMultipleFilesData
  } from "./capture.utils";
  export let event: ClipboardEvent;
  let nodeType: NodeType | undefined = undefined;
  const unsupportedNodeTypes = [NodeType.TWITTER_PROFILE, NodeType.TWEET];
  let nodeTypeLabel: string | undefined = undefined;
  let file: File | undefined = undefined;
  let multipleFilesData:
    | {
        files: { file: File; contentType: NodeType }[];
        incompatibleFormats: string[];
        totalCount: number;
        sizeExceededCount: number;
      }
    | undefined = undefined;
  let text: string | undefined = undefined;
  let isSaveInProgress: boolean = false;
  let isOpenOnSave: boolean = false;
  let isRememberChoice: boolean = false;
  let dev_isEnableChoice: boolean = false;
  let error: string | undefined = undefined;
  const MAX_FILE_SIZE_MB = 15;

  $: if (nodeType) nodeTypeLabel = resolveNodeContentLabel(nodeType);
  resolve(event);

  function resolve(event: ClipboardEvent) {
    if (!event) return;
    const filesData = event?.clipboardData?.files;
    text = event?.clipboardData?.getData("text");
    if (text) {
      if (text.startsWith("http")) {
        nodeType = resolveContentTypeForUrl(text);
      } else {
        nodeType = NodeType.SIMPLE_TEXT;
      }
    } else if (filesData && filesData.length === 1) {
      file = filesData[0];
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        error = "File size exceeds the maximum limit of 15 MB.";
        return;
      }
      nodeType = resolveContentTypeForFile(file);
    } else if (filesData && filesData.length > 1) {
      let allFiles = Array.from(filesData);
      multipleFilesData = resolveMultipleFilesData(allFiles, MAX_FILE_SIZE_MB);
      if (multipleFilesData && multipleFilesData.sizeExceededCount > 0) {
        error = `${multipleFilesData.sizeExceededCount} files exceed the maximum size of ${MAX_FILE_SIZE_MB} MB.`;
      }
    }
  }

  async function onSaveAsNode() {
    if (text) {
      await saveWebpage();
    } else if (file) {
      await saveFile();
    } else if (multipleFilesData) {
      await saveFiles();
    }
  }

  async function saveWebpage() {
    try {
      if (!text) return;
      isSaveInProgress = true;
      await captureStore.saveWebpage(text, {
        isPreventOpenOnSave: !isOpenOnSave
      });
      postSave();
    } catch (error) {
      logger.error(error);
    } finally {
      isSaveInProgress = false;
    }
  }

  function postSave() {
    isSaveInProgress = false;
    modalEvent.hide(MemotronAction.PASTE_CONFIRMATION);
  }

  async function saveFile() {
    if (!file) return;
    isSaveInProgress = true;
    await captureStore.saveFile(file, nodeType, {
      isPreventOpenOnSave: !isOpenOnSave
    });
    postSave();
  }

  async function saveFiles() {
    if (!multipleFilesData?.files) return;
    isSaveInProgress = true;
    await captureStore.saveMultipleFiles(multipleFilesData.files);
    postSave();
  }

  function resolvePasteResolutionMessage() {
    if (error) return error;
    if (nodeTypeLabel) return `${nodeTypeLabel} detected`;
    if (multipleFilesData?.totalCount)
      return `${multipleFilesData.totalCount} files detected. ${multipleFilesData.files?.length} can be saved as nodes.`;
    if (file) return "Unsupported file type. Can't be saved as node.";
    return "Nothing";
  }

  function onInsertIntoMarkdown() {
    modalEvent.hide(MemotronAction.PASTE_CONFIRMATION);
    appStore.toggleSearchParam({ clipboard: true });
    appStore.runAction(MemotronAction.CAPTURE);
  }

  function resolveInsertIntoMdLabel() {
    if (multipleFilesData) {
      return `Insert ${multipleFilesData.totalCount} into markdown`;
    }
    if (file && !nodeTypeLabel) {
      return "Insert file into markdown";
    }
    return "Insert into markdown";
  }
</script>

<div class="flex flex-col justify-between items-center w-full h-full">
  <div
    class="flex flex-col gap-2 items-center justify-center h-36 w-full rounded-md bg-bgs2 p-2"
  >
    {#if file}
      <FileView
        blob={new Blob([file], { type: file.type })}
        class="h-24 object-cover rounded-md"
      />
    {/if}
    {#if text}
      <div class="flex flex-col w-full">
        <span class="text-b3 text-fgs3 truncate w-full">{text}</span>
      </div>
    {/if}
    <span class="flex gap-2 items-center">
      {#if nodeType}
        <Icon icon={resolveNodeIcon(nodeType)} />
      {/if}
      {resolvePasteResolutionMessage()}
    </span>
    <span class="text-b3 text-fgs3">
      {#if multipleFilesData && multipleFilesData.incompatibleFormats.length > 0}
        Unsupported formats: {multipleFilesData.incompatibleFormats.join(", ")}
      {:else if file && !nodeTypeLabel && !error}
        Supported formats: .jpg, .png, .mp3, .wav
      {/if}
    </span>
  </div>
  <div class="flex flex-col gap-3 w-72 flex-1 items-center justify-center">
    {#if nodeType && unsupportedNodeTypes.includes(nodeType)}
      <span>Direct <b>{nodeTypeLabel}</b> saving is not supported yet.</span>
    {:else if !error}
      {#if nodeType && nodeType !== NodeType.SIMPLE_TEXT}
        <Button
          label="Save and open"
          icon="ph:arrow-up-right-light"
          isLoading={isSaveInProgress && isOpenOnSave}
          isExpandToFullWidth={true}
          type={ButtonVariant.PRIMARY}
          on:click={() => {
            isOpenOnSave = true;
            onSaveAsNode();
          }}
        />
        <Button
          label="Save and close"
          icon="ph:arrow-right-light"
          isLoading={isSaveInProgress && !isOpenOnSave}
          isExpandToFullWidth={true}
          on:click={onSaveAsNode}
        />
      {/if}
      {#if multipleFilesData?.files && multipleFilesData.files.length > 1}
        <Button
          label="Save {multipleFilesData.files.length} nodes"
          icon="ph:arrow-right-light"
          isLoading={isSaveInProgress && !isOpenOnSave}
          isExpandToFullWidth={true}
          type={ButtonVariant.PRIMARY}
          on:click={onSaveAsNode}
        />
      {/if}
      <Button
        label={resolveInsertIntoMdLabel()}
        badge="soon"
        tooltip="Coming soon"
        isDisabled={true}
        icon="ph:markdown-logo-light"
        on:click={onInsertIntoMarkdown}
        isExpandToFullWidth={true}
      />
      {#if dev_isEnableChoice}
        <div class="flex w-full justify-center mt-2">
          <CheckboxInput
            label="Remember my choice"
            width="!w-40"
            bind:checked={isRememberChoice}
          />
        </div>
      {/if}
    {/if}
  </div>
</div>
