<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import { ErrorMessage } from "$lib/client/components/error/error.type";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import CheckboxInput from "$lib/client/elements/toggle/CheckboxInput.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { onMount } from "svelte";
  import { MAX_FILE_SIZE_MB } from "../../../components/record/record.store";
  import { MemotronAction } from "../memotronAction.enum";
  import { NodeType } from "../node/node.type";
  import { resolveNodeContentLabel, resolveNodeIcon } from "../node/node.utils";
  import { sanitizeAndResolve } from "../node/url.utils";
  import {
    ActiveCaptureStore,
    clipboard,
    type IActiveCaptureStore
  } from "./capture.store";
  import type {
    IMultiFileCaptureData,
    IPasteCaptureData
  } from "./capture.type";
  import {
    resolveContentTypeForFile,
    resolveMultipleFilesData,
    resolvePasteContents
  } from "./capture.utils";
  import account from "$lib/client/stores/account.store";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import { generateResourceId } from "$lib/shared/utils/surreal.utils";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  export let event: ClipboardEvent;
  let id = generateResourceId(Resource.capture);
  let captureStore: IActiveCaptureStore = ActiveCaptureStore.resolve(id);
  let nodeType: NodeType | undefined = undefined;
  const unsupportedNodeTypes = [NodeType.TWITTER_PROFILE];
  const cannotSaveAsStandaloneNodeTypes = [
    NodeType.SIMPLE_TEXT,
    NodeType.CODE,
    NodeType.FILE
  ];
  let nodeTypeLabel: string | undefined = undefined;
  /**
   * @deprecated - use data
   */
  let file: File | undefined = undefined;
  /**
   * @deprecated - use data
   */
  let isEmbed: boolean | undefined = undefined;
  /**
   * @deprecated - use data
   */
  let multipleFilesData: IMultiFileCaptureData | undefined = undefined;
  /**
   * @deprecated - use data
   */
  let text: string | undefined = undefined;
  let isSaveInProgress: boolean = false;
  let isOpenOnSave: boolean = false;
  let isRememberChoice: boolean = false;
  let dev_isEnableChoice: boolean = false;
  let error: string | undefined = undefined;
  let data: IPasteCaptureData | undefined = undefined;
  let saveAsNodeFilesCount: number = 0;
  let isOffline: boolean = false;

  $: if (nodeType) nodeTypeLabel = resolveNodeContentLabel(nodeType);
  resolveV2(event);

  onMount(async () => {
    isOffline = account.isCloudUserAndOffline();
  });

  /**
   * @deprecated - use resolveV2
   * @param event
   */
  function resolve(event: ClipboardEvent) {
    if (!event) return;
    const filesData = event?.clipboardData?.files;
    text = event?.clipboardData?.getData("text");
    if (text) {
      const result = sanitizeAndResolve(text);
      if (typeof result === "string") {
        nodeType = NodeType.SIMPLE_TEXT;
        text = result;
      } else {
        nodeType = result.contentType;
        text = result.url;
        isEmbed = result.isEmbed;
      }
    } else if (filesData && filesData.length === 1) {
      file = filesData[0];
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        error = `File size exceeds the maximum limit of ${MAX_FILE_SIZE_MB} MB.`;
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

  async function resolveV2(event: ClipboardEvent) {
    if (!event) return;
    data = await resolvePasteContents(event, {
      maxFileSizeInMb: MAX_FILE_SIZE_MB
    });
    if (!data || data.error) {
      error = data?.error ?? ErrorMessage.DEFAULT;
      return;
    }
    nodeType = data.contentType;
    if (data.multipleFiles && data.multipleFiles.files?.length > 0) {
      saveAsNodeFilesCount = data.multipleFiles?.files?.filter((file) => {
        return file.contentType !== NodeType.FILE;
      }).length;
    }
  }

  async function onSaveAsNode() {
    try {
      if (!data) return;
      isSaveInProgress = true;
      if (data.text) {
        await captureStore.saveWebpage(data.text, {
          isPreventOpenOnSave: !isOpenOnSave,
          contentType: nodeType
        });
      } else if (data.file) {
        await captureStore.saveFile(data.file, nodeType, {
          isPreventOpenOnSave: !isOpenOnSave
        });
      } else if (data.multipleFiles && data.multipleFiles.files.length > 1) {
        await captureStore.saveMultipleFiles(data.multipleFiles.files);
      }
      postSave();
    } catch (error) {
      logger.error({ at: "PasteConfirmationModal.onSaveAsNode", error });
    } finally {
      isSaveInProgress = false;
    }
  }

  function postSave() {
    isSaveInProgress = false;
    modalEvent.hide(MemotronAction.PASTE_CONFIRMATION);
  }

  function resolvePasteResolutionMessage(data: IPasteCaptureData | undefined) {
    if (error) return error;
    if (nodeTypeLabel) return `${nodeTypeLabel} detected`;
    if (data?.multipleFiles?.totalCount)
      return `${data.multipleFiles.totalCount} files detected. ${saveAsNodeFilesCount} can be saved as ${saveAsNodeFilesCount > 1 ? "nodes" : "node"}.`;
    if (data?.file && nodeType === NodeType.FILE)
      return "Unsupported file type. Can't be saved as node.";
    if (data?.text) return "Text detected";
    return "Nothing";
  }

  function onInsertIntoMarkdown() {
    clipboard.set({
      ...data
    });
    modalEvent.hide(MemotronAction.PASTE_CONFIRMATION);
    appStore.runAction(
      resourceAction(Resource.node, ResourceActionType.CREATE),
      {
        searchParams: {
          [AppSearchParam.CLIPBOARD]: true
        },
        componentParams: {
          captureId: id
        }
      }
    );
  }

  function resolveInsertIntoMdLabel(data: IPasteCaptureData | undefined) {
    if (data?.multipleFiles) {
      return `Insert ${data.multipleFiles.totalCount} into markdown`;
    }
    if (data?.file && !nodeTypeLabel) {
      return "Insert file into markdown";
    }
    return "Insert into markdown";
  }

  function resovleUnsupportedFormats(data: IMultiFileCaptureData | undefined) {
    if (!data) return;
    return data.files
      .filter((file) => {
        return file.contentType === NodeType.FILE;
      })
      ?.map((file) => {
        return file.file.name.split(".").pop();
      })
      ?.join(", ");
  }

  $: console.log({ data, nodeType, nodeTypeLabel });
</script>

<div class="flex flex-col justify-between items-center w-full h-full">
  <div
    class="flex flex-col gap-2 items-center justify-center h-36 w-full rounded-md bg-bgs2 p-2"
  >
    {#if data?.file}
      <FileView
        blob={new Blob([data.file], { type: data.file.type })}
        class="h-24 object-cover rounded-md"
      />
    {/if}
    {#if data?.text}
      <div class="flex flex-col items-center w-full">
        <span class="text-b3 text-fgs3 truncate w-full text-center"
          >{data.text}</span
        >
      </div>
    {/if}
    <span class="flex gap-2 items-center">
      {#if nodeType}
        <Icon icon={resolveNodeIcon(nodeType, data?.text)} />
      {/if}
      {resolvePasteResolutionMessage(data)}
    </span>
    <span class="text-b3 text-fgs3">
      {#if data?.multipleFiles && saveAsNodeFilesCount < data.multipleFiles.files?.length}
        Unsupported formats for node: {resovleUnsupportedFormats(
          data.multipleFiles
        )}
        <!-- {multipleFilesData.incompatibleFormats.join(", ")} -->
      {:else if data?.file && !nodeTypeLabel && !error}
        Supported formats: .jpg, .png, .mp3, .wav
      {/if}
    </span>
  </div>
  <div class="flex flex-col gap-3 w-72 flex-1 items-center justify-center">
    {#if nodeType && unsupportedNodeTypes.includes(nodeType)}
      <span>Direct <b>{nodeTypeLabel}</b> saving is not supported yet.</span>
    {:else if isOffline}
      <InlineErrorMessage
        error={"You seem to be offline. File upload is not yet available in offline mode."}
        isDissappear={false}
      />
    {:else if !error}
      {#if nodeType && !cannotSaveAsStandaloneNodeTypes.includes(nodeType)}
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
      {#if data?.multipleFiles && saveAsNodeFilesCount >= 1}
        <Button
          label="Save {saveAsNodeFilesCount} as {saveAsNodeFilesCount === 1
            ? 'node'
            : 'nodes'}"
          icon="ph:arrow-right-light"
          isLoading={isSaveInProgress && !isOpenOnSave}
          isExpandToFullWidth={true}
          type={ButtonVariant.PRIMARY}
          on:click={onSaveAsNode}
        />
      {/if}
      <Button
        label={resolveInsertIntoMdLabel(data)}
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
