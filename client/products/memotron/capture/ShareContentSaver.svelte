<script lang="ts">
  import { logger } from "@21n/components/debug/logger.client";
  import Button from "@21n/elements/button/Button.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import NodeThumbnail from "@21n/products/memotron/node/thumbnail/NodeThumbnail.svelte";
  import { Arrangement } from "@21n/types/direction.enum";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import { Size } from "@21n/types/size.enum";
  import FileView from "@21n/components/files/FileView.svelte";
  import {
    NodeType,
    type INode,
    type INodeThumb
  } from "@21n/products/memotron/node/node.type";
  import {
    resolveNodeContentLabel,
    resolveNodeIcon
  } from "@21n/products/memotron/node/node.utils";
  import type {
    IPasteCaptureData,
    IMultiFileCaptureData
  } from "@21n/products/memotron/capture/capture.type";
  import InlineErrorMessage from "@21n/elements/text/InlineErrorMessage.svelte";
  import { onMount, createEventDispatcher } from "svelte";
  import {
    ActiveCaptureStore,
    type IActiveCaptureStore
  } from "@21n/products/memotron/capture/capture.store";
  import { generateResourceId } from "@21n/components/flux/flux.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { nodeStore } from "@21n/products/memotron/node/node.store";
  import context from "@21n/stores/context.store";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import InlineMarkdownTextInput from "@21n/components/markdown/content/InlineMarkdownTextInput.svelte";
  import ButtonGroup from "@21n/elements/button/ButtonGroup.svelte";
  import InlineFeedbackText from "@21n/extensions/clipper/InlineFeedbackText.svelte";
  import { AlertType, type IInlineStatus } from "@21n/types/notification.type";
  import LinkBoxOnSaver from "@21n/products/memotron/capture/LinkBoxOnSaver.svelte";
  import {
    getSheetNodeByUrl,
    saveSheetNode
  } from "@21n/persistence/dexie/sheetStorage";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { Action } from "@21n/types/action.enum";
  import type { IRecordId } from "@21n/types/data.type";
  import { tick } from "svelte";
  import { cn } from "@21n/utils/ui.utils";

  export let data: IPasteCaptureData | undefined = undefined;
  export let nodeType: NodeType;
  export let error: string | undefined = undefined;
  export let isOffline: boolean = false;
  export let isShowInsertIntoMarkdown: boolean = false;
  export let saveAsNodeFilesCount: number = 0;
  let feedback: IInlineStatus | undefined = undefined;
  const dispatch = createEventDispatcher();
  const unsupportedNodeTypes = [NodeType.TWITTER_PROFILE];
  const cannotSaveAsStandaloneNodeTypes = [
    NodeType.SIMPLE_TEXT,
    NodeType.CODE,
    NodeType.FILE,
    NodeType.UNKNOWN
  ];

  let nodeTypeLabel: string | undefined = undefined;
  let isSaveInProgress: boolean = false;
  let savedNodeId: string | undefined = undefined;
  let expandedLink: IRecordId | null = null;
  let savedNode: INodeThumb | undefined = undefined;
  let sideNotes: string = "";
  let isSavingSideNotes: boolean = false;
  let captureStore: IActiveCaptureStore;
  let refreshId: number = new Date().getTime();
  let isEditingLabel: boolean = false;
  let editedLabel: string = "";
  let previousLabel: string = "";
  let textInputRef: TextInput;
  let linkBoxRef: LinkBoxOnSaver | null = null;

  $: if (nodeType) nodeTypeLabel = resolveNodeContentLabel(nodeType);
  $: isShowSaveOptions =
    !savedNodeId &&
    !error &&
    !isOffline &&
    nodeType &&
    !unsupportedNodeTypes.includes(nodeType);
  $: multipleFilesLength = data?.multipleFiles?.files?.length ?? 0;

  onMount(() => {
    const id = generateResourceId(Resource.capture);
    captureStore = ActiveCaptureStore.resolve(id);
    if (
      multipleFilesLength < 2 &&
      !cannotSaveAsStandaloneNodeTypes.includes(nodeType ?? NodeType.UNKNOWN)
    )
      handleSave(false);
    else if (
      $context.isStandaloneSheet &&
      data?.text &&
      (!nodeType || [NodeType.SIMPLE_TEXT, NodeType.UNKNOWN].includes(nodeType))
    ) {
      handleSave(false);
    }
  });

  async function handleSave(isOpenOnSave: boolean) {
    try {
      console.log({
        at: "ShareContentSaver.handleSave",
        nodeType,
        data,
        captureStore
      });
      if (!data || !captureStore) return;
      isSaveInProgress = true;
      const nodeIdCheck = await performAlreadySavedCheck();
      if (nodeIdCheck) {
        savedNode = nodeIdCheck;
        savedNodeId = nodeIdCheck.id;
        sideNotes = nodeIdCheck.notes ?? "";
        feedback = {
          message: `${nodeTypeLabel} already saved!`,
          type: AlertType.SUCCESS
        };
        if (!$context.isStandaloneSheet && nodeIdCheck.id) {
          await refreshLinkBox(nodeIdCheck.id as IRecordId);
        }
        return;
      }
      let result: INode | undefined;
      if (
        data.text &&
        nodeType &&
        [NodeType.SIMPLE_TEXT, NodeType.UNKNOWN].includes(nodeType)
      ) {
        result = await captureStore.saveMarkdownFromText(data.text);
      } else if (data.text) {
        result = await captureStore.saveWebpage(data.text, {
          contentType: nodeType,
          isOpenOnSave: false
        });
      } else if (data.file) {
        result = await captureStore.saveFile(data.file, nodeType, {
          isOpenOnSave: false
        });
      } else if (data.multipleFiles && data.multipleFiles.files.length > 1) {
        await captureStore.saveMultipleFiles(data.multipleFiles.files);
      }
      if (result) {
        savedNode = result as INodeThumb;
        savedNodeId = savedNode?.id;
        if ($context.isStandaloneSheet && savedNode && data?.text) {
          await saveSheetNode({
            url: data.text,
            node: savedNode
          });
        }
        if (isOpenOnSave) {
          dispatch("open", { nodeId: savedNodeId });
        }
        dispatch("saved", { nodeId: savedNodeId });
        feedback = {
          message: `${nodeTypeLabel} saved!`,
          type: AlertType.SUCCESS
        };
        if (!$context.isStandaloneSheet && savedNodeId) {
          await refreshLinkBox(savedNodeId as IRecordId);
        }
      }
    } catch (error) {
      logger.error({ at: "ShareContentSaver.handleSave", error });
      dispatch("error", { error });
      feedback = {
        message: "Failed to save",
        type: AlertType.ERROR
      };
    } finally {
      isSaveInProgress = false;
    }
  }

  async function performAlreadySavedCheck() {
    if (nodeType !== NodeType.WEB_PAGE) return;
    const url = data?.text;
    if (!url) return;
    if ($context.isStandaloneSheet) {
      const stored = await getSheetNodeByUrl(url);
      if (stored?.node) {
        return stored.node;
      }
    } else {
      const results = await nodeStore.selectMany({
        filters: {
          contentType: nodeType,
          url
        }
      });
      if (results && results.length > 0) {
        return results[0];
      }
    }
  }

  async function handleSaveSideNotes() {
    if (!savedNodeId || !sideNotes.trim()) return;

    try {
      isSavingSideNotes = true;
      await nodeStore.modify(savedNodeId, {
        notes: sideNotes
      });
      if (savedNode) {
        savedNode = { ...savedNode, notes: sideNotes };
        refreshId = Date.now();
        if ($context.isStandaloneSheet && data?.text) {
          await saveSheetNode({
            url: data.text,
            node: savedNode
          });
        }
      }
      dispatch("notesSaved");
    } catch (error) {
      logger.error({ at: "ShareContentSaver.handleSaveSideNotes", error });
      feedback = {
        message: "Failed to save notes",
        type: AlertType.ERROR
      };
    } finally {
      setTimeout(() => {
        isSavingSideNotes = false;
      }, 1500);
    }
  }

  async function handleClose() {
    dispatch("close");
  }

  async function handleOpen() {
    if (savedNodeId) {
      dispatch("open", { nodeId: savedNodeId });
    }
  }

  function handleInsertIntoMarkdown() {
    dispatch("insertIntoMarkdown");
  }

  function resolvePasteResolutionMessage(data: IPasteCaptureData | undefined) {
    if (error) return error;
    if (nodeTypeLabel) return `${nodeTypeLabel} detected`;
    if (data?.multipleFiles?.totalCount)
      return `${data.multipleFiles.totalCount} files detected. ${saveAsNodeFilesCount} can be saved as ${saveAsNodeFilesCount > 1 ? "nodes" : "node"}.`;
    if (data?.file && nodeType === NodeType.FILE)
      return "Unsupported file type. Can't be saved as node.";
    if (data?.text) return "Text detected";
    return "Content not recognized. Please try again.";
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

  function handleThumbnailClick() {
    if ($context.isStandaloneSheet && savedNode) {
      previousLabel = savedNode.label ?? "";
      editedLabel = savedNode.label ?? "";
      isEditingLabel = true;
    }
  }

  async function handleSaveLabel() {
    if (!savedNodeId) {
      isEditingLabel = false;
      return;
    }

    try {
      const trimmedLabel = editedLabel.trim();
      await nodeStore.modify(savedNodeId, {
        label: trimmedLabel
      });
      if (savedNode) {
        savedNode = { ...savedNode, label: trimmedLabel };
        refreshId = Date.now();
        if ($context.isStandaloneSheet && data?.text) {
          await saveSheetNode({
            url: data.text,
            node: savedNode
          });
        }
      }
      isEditingLabel = false;
    } catch (error) {
      logger.error({ at: "ShareContentSaver.handleSaveLabel", error });
      feedback = {
        message: "Failed to save label",
        type: AlertType.ERROR
      };
    }
  }

  function handleCancelEditLabel() {
    editedLabel = previousLabel;
    isEditingLabel = false;
  }

  async function refreshLinkBox(nodeId: IRecordId | undefined) {
    if (!nodeId || $context.isStandaloneSheet) return;
    await tick();
    await linkBoxRef?.refreshLinkedData(nodeId);
  }

  function handleSavedNodeChange(
    event: CustomEvent<{ savedNode: INodeThumb }>
  ) {
    savedNode = event.detail.savedNode;
    refreshId = Date.now();
  }
</script>

<div class="flex flex-col justify-between items-center w-full h-full">
  {#if isSaveInProgress}
    <EmptyStatusView isLoadingState={true} loadingText="Saving..." />
  {:else if !savedNodeId && !$context.isStandaloneSheet}
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
        {#if isShowSaveOptions && !cannotSaveAsStandaloneNodeTypes.includes(nodeType)}
          <Button
            label="Save and open"
            icon="pop"
            isLoading={isSaveInProgress}
            isExpandToFullWidth={true}
            type={ButtonVariant.PRIMARY}
            on:click={() => handleSave(true)}
          />
          <Button
            label="Save and close"
            icon="ph:arrow-u-down-left-light"
            isLoading={isSaveInProgress}
            isExpandToFullWidth={true}
            on:click={() => handleSave(false)}
          />
        {/if}
        {#if data?.multipleFiles && saveAsNodeFilesCount >= 1}
          <Button
            label="Save {saveAsNodeFilesCount} as {saveAsNodeFilesCount === 1
              ? 'node'
              : 'nodes'}"
            icon="proceed"
            isLoading={isSaveInProgress}
            isExpandToFullWidth={true}
            type={ButtonVariant.PRIMARY}
            on:click={() => handleSave(false)}
          />
        {/if}
        {#if isShowInsertIntoMarkdown}
          <Button
            label={resolveInsertIntoMdLabel(data)}
            icon="markdown"
            on:click={handleInsertIntoMarkdown}
            isExpandToFullWidth={true}
          />
          <Button
            label="Close"
            icon="cross"
            on:click={handleClose}
            isExpandToFullWidth={true}
          />
        {/if}
      {/if}
    </div>
  {:else if savedNodeId}
    <div
      class={cn("flex flex-col  w-full h-full overflow-y-auto", {
        "pt-3": $context.isStandaloneSheet,
        "pt-6": !$context.isStandaloneSheet
      })}
    >
      <InlineFeedbackText {feedback} isAutoDissappear={false} />
      {#if savedNode}
        {#key refreshId}
          <div class="px-3 cw:py-6 py-8">
            {#if isEditingLabel && $context.isStandaloneSheet}
              <div class="flex flex-col gap-2 w-full">
                <TextInput
                  bind:value={editedLabel}
                  bind:this={textInputRef}
                  placeholder="Enter node label..."
                  size={Size.md}
                  isShowSaveControl={true}
                  on:mount={() => {
                    textInputRef?.focus();
                  }}
                  on:enter={handleSaveLabel}
                  on:save={handleSaveLabel}
                  on:cancel={handleCancelEditLabel}
                />
              </div>
            {:else}
              <button
                class="w-full"
                on:click={handleThumbnailClick}
                disabled={!$context.isStandaloneSheet}
              >
                <NodeThumbnail
                  item={savedNode}
                  arrangement={Arrangement.LIST}
                  accessPoint={ResourceAccessPoint.BROWSER}
                  accessPointId={savedNode.id}
                  size={Size.md}
                />
              </button>
            {/if}
          </div>
        {/key}
      {/if}

      {#if !$context.isStandaloneSheet}
        <div class="p-3 overflow-y-auto styledscroll">
          <LinkBoxOnSaver
            bind:this={linkBoxRef}
            {savedNodeId}
            {savedNode}
            bind:expandedLink
            on:savedNodeChange={handleSavedNodeChange}
          />
        </div>
      {/if}
      {#if !expandedLink}
        <div class="flex flex-col w-full gap-2 bg-bgs2 flex-grow">
          <div
            class="flex w-full items-center justify-between border-y border-brs2 px-3 py-1 text-fgs3"
          >
            <span> Notes </span>
            {#if isSavingSideNotes}
              <div>
                <InlineFeedbackText
                  feedback={{ message: "Saving...", type: AlertType.PROGRESS }}
                  size={Size.sm}
                />
              </div>
            {/if}
          </div>
          <div class="flex-grow px-3 py-1">
            <InlineMarkdownTextInput
              placeholder="Start typing to add notes..."
              bind:content={sideNotes}
              on:debouncedChange={handleSaveSideNotes}
            />
          </div>
        </div>
      {/if}
      {#if !$context.isStandaloneSheet}
        <div class="mt-auto">
          <ButtonGroup
            isFooter={true}
            buttons={[
              {
                label: "Open",
                icon: "pop",
                variant: ButtonVariant.PRIMARY,
                style: ButtonStyle.OUTLINED,
                callback: handleOpen
              },
              {
                label: "Done",
                icon: "ph:check",
                callback: handleClose,
                shortcut: Action.CLOSE
              }
            ]}
          />
        </div>
      {/if}
    </div>
  {:else}
    <EmptyStatusView subText="Share not available for this content type." />
  {/if}
</div>
