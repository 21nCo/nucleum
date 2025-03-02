<script lang="ts">
  import Writer from "./Writer.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { appStore, isInEditMode } from "$lib/client/stores/app.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import LinkboxOnCapture from "../common/linkbox/LinkboxOnCapture.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import TypeSelector from "./TypeSelector.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import PropertiesListView from "$lib/client/components/collection/properties/PropertiesListView.svelte";
  import NodeAvatar from "$lib/client/products/memotron/node/avatar/NodeAvatar.svelte";
  import {
    LinkType,
    NodeType,
    type INodeThumb
  } from "$lib/client/products/memotron/node/node.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { collectionStore } from "$lib/client/components/collection/collection.store";
  import { CaptureType, type ICaptureLink } from "./capture.type";
  import FileUploader from "./FileUploader.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { onDestroy, onMount } from "svelte";
  import { page } from "$app/stores";
  import { logger } from "$lib/client/components/debug/logger.client";
  import {
    CollectionType,
    type ICollectionExpanded
  } from "$lib/client/components/collection/collection.type";
  import {
    isRecordId,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import {
    isEmptyMd,
    resolveDefaultBodyForBlock,
    textToMdBlocks
  } from "$lib/client/components/markdown/markdown.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import view from "$lib/client/stores/view.store";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IBlock } from "$lib/client/components/markdown/md.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { generateResourceId } from "$lib/client/components/flux/flux.utils";
  import { fly } from "svelte/transition";
  import { postMessageToParent } from "$lib/client/utils/embed.utils";
  import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
  import { appEvents } from "$lib/client/stores/notification.store";
  import type { IEvent } from "$lib/client/types/event.type";
  import { MemotronEvent } from "../memotron.type";
  import Tag from "$lib/client/elements/text/Tag.svelte";
  import { Orientation, Placement } from "$lib/client/types/direction.enum";
  import type { IRecordId } from "$lib/client/types/data.type";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import {
    ActiveCaptureStore,
    type IActiveCaptureStore
  } from "./capture.store";
  import { debouncer } from "$lib/client/utils/utils";
  import CaptureDraftsAction from "./draftSelector/CaptureDraftsAction.svelte";
  export let captureId: IRecordId = generateResourceId(Resource.capture);
  export let isWindowDnD = false;
  let bulkQueryParam: string | null = null;
  let linkQueryParam: string | null = null;
  let captureStore: IActiveCaptureStore;
  if (captureId) captureStore = ActiveCaptureStore.resolve(captureId);
  let isSaving: boolean = false;
  let isEmptyState: boolean = true;
  isInEditMode.set(true);
  let isPropertiesCollapsed: boolean = false;
  let writerRef: Writer | undefined = undefined;
  let types: ICollectionExpanded[] = [];
  let cameraCaptureRef: HTMLInputElement;
  let captureType: CaptureType = isWindowDnD
    ? CaptureType.UPLOAD
    : CaptureType.MARKDOWN;
  // $: console.log({ types, $captureStore, propertyConfig });
  let dev_iosCameraCaptureMethod: "input" | "swift-relay" = "input";
  let dev_isShowDraftSaveFeedback: boolean = false;
  let isProcessingClipboard: boolean = false;
  let subs: any[] = [];
  let isLinksExpanded: boolean = false;
  let expandedType: IRecordId | null = null;
  let isCaptureFromCollectionPage: boolean = false;
  async function refreshTypeData() {
    const typeIds =
      $captureStore.links
        ?.filter(
          (x) =>
            x.toSubType === CollectionType.TYPED &&
            x.linkType === LinkType.DIRECT &&
            x.from === "root"
        )
        ?.map((x) => x.to) ?? [];
    if (typeIds.length === 0) {
      types = [];
      return;
    }
    types = await collectionStore.resolveTypes(typeIds);
  }

  onMount(async () => {
    const appEventSub = appEvents.subscribe((x: IEvent) => {
      if (x.event === MemotronEvent.SAVE_CAPTURE_SHORTCUT) {
        onSave();
      }
    });
    subs.push(appEventSub);
    if (captureType !== CaptureType.MARKDOWN && !isWindowDnD) {
      reset();
    }
    linkQueryParam = $page.url.searchParams.get("link");
    bulkQueryParam = $page.url.searchParams.get("bulk");
    const clipBoardQueryParam = $page.url.searchParams.get("clipboard");
    logger.log({
      at: "Capture.svelte - mount",
      linkQueryParam,
      bulkQueryParam,
      clipBoardQueryParam
    });
    if (linkQueryParam) {
      await setTypeFromLinkParam(linkQueryParam);
    } else {
      refreshEmptyState();
    }
    if (clipBoardQueryParam === "true") {
      onClipboard();
    }
  });

  /**
   * Note: a timeout is added to remove query params - since without timeout, it is interfering with removal of pop query param for capture thus the capture modal keeps opening
   */
  onDestroy(() => {
    subs.forEach((x) => x());
    setTimeout(() => {
      appStore.toggleSearchParam(["link", "bulk", "clipboard"]);
    }, 100);
  });

  /**
   * Handles clipboard event - insert into markdown option via global paste or file uploader
   */
  async function onClipboard() {
    try {
      logger.debug({
        at: "Capture.svelte - onClipboard",
        clipboard: $captureStore.clipboard
      });
      isProcessingClipboard = true;
      const ogEmptyState = isEmptyState;
      isEmptyState = false;
      if (!$captureStore.clipboard || !$captureStore.body) return;
      const data = $captureStore.clipboard;
      let newBlock: IBlock[] | undefined = undefined;

      if (data.multipleFiles) {
        const result = await captureStore.saveMultipleFiles(
          data.multipleFiles.files,
          {
            isEmbedContext: true
          }
        );
        if (!result || "error" in result) return;
        result.forEach((x) => {
          const block: IBlock = {
            id: generateResourceId(Resource.node),
            contentType: NodeType.EMBED,
            body: {
              id: x.id,
              subType: x.contentType
            }
          };
          newBlock = [...(newBlock ?? []), block];
          captureStore.addMentionLink("root", x as INodeThumb, {
            location: block.id
          });
        });
      } else if (data.file) {
        const result = await captureStore.saveFile(
          data.file,
          data.contentType,
          {
            isEmbedContext: true
          }
        );
        if (!result || "error" in result) return;
        newBlock = [
          {
            id: generateResourceId(Resource.node),
            contentType: NodeType.EMBED,
            body: {
              id: result.id,
              subType: result.contentType
            }
          }
        ];
        captureStore.addMentionLink("root", result as INodeThumb, {
          location: newBlock[0].id
        });
      } else if (data.text) {
        if (data.textMetadata?.isMultiBlockText) {
          newBlock = textToMdBlocks(data.text);
        } else if (data.textMetadata?.isUrl) {
          const saveResult = await captureStore.saveWebpage(data.text, {
            contentType: data.contentType,
            isEmbedContext: true
          });
          if (
            !saveResult ||
            !Array.isArray(saveResult) ||
            "error" in saveResult
          )
            return;
          newBlock = [
            {
              id: generateResourceId(Resource.node),
              contentType: NodeType.EMBED,
              body: {
                id: saveResult[0].id,
                subType: saveResult[0].contentType
              }
            }
          ];
          captureStore.addMentionLink("root", saveResult[0] as INodeThumb, {
            location: newBlock[0].id
          });
        } else {
          const contentType = data.contentType ?? NodeType.SIMPLE_TEXT;
          newBlock = [
            {
              id: generateResourceId(Resource.node),
              contentType,
              body: resolveDefaultBodyForBlock(contentType, data.text)
            }
          ];
        }
      }

      if (!newBlock) return;
      if (ogEmptyState) {
        $captureStore.body.blocks.unshift(...newBlock);
      } else {
        $captureStore.body.blocks.push(...newBlock);
      }
      $captureStore.refreshId = new Date().getTime();
      persist();
    } catch (e) {
      logger.error({ at: "Capture.svelte - onClipboard", error: e });
    } finally {
      isEmptyState = false;
      isProcessingClipboard = false;
      $captureStore.clipboard = undefined;
    }
  }

  async function onTypeSelect(e: CustomEvent) {
    if (
      e.detail === CaptureType.CAMERA &&
      $context.isEmbed &&
      $context.os === OperatingSystem.IOS
    ) {
      if (dev_iosCameraCaptureMethod === "input") {
        triggerNativeCameraCaptureUsingInputAPI();
      } else {
        //TODO
      }
      return;
    }
    if (
      e.detail === CaptureType.UPLOAD &&
      $context.isEmbed &&
      $context.os === OperatingSystem.IOS
    ) {
      return;
    }
    isEmptyState = false;
    await captureStore.onTypeSelect(e.detail);
    await refreshTypeData();
    if (isRecordId(e.detail)) {
      isLinksExpanded = true;
      expandedType = e.detail;
    }

    function triggerNativeCameraCaptureUsingInputAPI() {
      setTimeout(() => {
        cameraCaptureRef?.click();
      }, 10);
    }
  }

  async function onLink(e: CustomEvent) {
    if (e.detail.id && e.detail.type === CollectionType.TYPED) {
      await refreshTypeData();
      expandedType = e.detail.id;
    } else {
      expandedType = null;
    }
  }
  async function onUnlink(e: CustomEvent) {
    if (e.detail && types.some(resourceInList(e.detail))) {
      await refreshTypeData();
    }
  }

  function refreshEmptyState(e?: CustomEvent) {
    logger.log({ at: "Capture.svelte - refreshEmptyState", e });
    if (
      isValidString($captureStore.label) ||
      captureType === CaptureType.AUDIO
    ) {
      isEmptyState = false;
      return;
    }
    if (
      $captureStore.body &&
      "blocks" in $captureStore.body &&
      !isEmptyMd(e?.detail?.md?.blocks ?? $captureStore.body.blocks)
    ) {
      isEmptyState = false;
      return;
    }
    isEmptyState = true;
  }

  function reset() {
    captureStore.reset();
    isEmptyState = true;
    captureType = CaptureType.MARKDOWN;
    types = [];
    if ($view.isConstrainedWidth) {
      appStore.closeResource({ accessMode: ResourceAccessMode.POP });
    }
    postMessageToParent(EmbedMessage.MENU_ITEM_SELECTED);
  }

  async function setTypeFromLinkParam(linkQueryParam: string) {
    await captureStore.directLink(linkQueryParam);
    await refreshTypeData();
    isLinksExpanded = true;
    isCaptureFromCollectionPage = true;
    // isEmptyState = false;
  }

  function onTitleEnter(e: any) {
    writerRef?.focus();
    refreshEmptyState();
  }

  async function handleCapture(event: Event) {
    logger.log({ at: "Capture.svelte - handleCapture", event });
    try {
      isSaving = true;
      const input = event.target as HTMLInputElement;
      if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file) {
          await captureStore.saveFile(file);
          isSaving = false;
          return;
        }
        console.log({
          at: "Capture.svelte - handleCapture - file",
          file,
          message: "file not present",
          captureType
        });
        // const reader = new FileReader();
        // reader.onload = (e) => {
        //   const result = e.target?.result;
        //   if (typeof result === "string") {
        //     fetch(result)
        //       .then((res) => res.blob())
        //       .then(async (blob) => {
        //         await captureStore.saveCameraCapture(blob);
        //         isSaving = false;
        //       });
        //   }
        // };
        // reader.readAsDataURL(file);
      } else {
        logger.log({
          at: "Capture.svelte - handleCapture - no file present"
        });
        reset();
      }
    } catch (e) {
      logger.error({ at: "Capture.svelte - handleCapture", error: e });
      isSaving = false;
    }
  }

  function onCameraCancel(e: Event) {
    logger.log({ at: "Capture.svelte - onCameraCancel", e });
    if (e.type === "cancel") {
      reset();
    }
  }

  async function onSave() {
    isSaving = true;
    const result = await captureStore.saveMarkdownCapture();
    if (bulkQueryParam === "true" && linkQueryParam) {
      await setTypeFromLinkParam(linkQueryParam);
    } else {
      types = [];
      isEmptyState = true;
    }
    isSaving = false;
  }

  function resolveDirectLinksCount(links: ICaptureLink[] | undefined) {
    const len = links?.filter(
      (x) => x.linkType === LinkType.DIRECT && x.from === "root"
    )?.length;
    if (len && len > 0) return len;
    return undefined;
  }

  function persistLabel() {
    captureStore.modify(
      { label: $captureStore.label },
      { isPreventBackPropagation: true }
    );
  }

  function onContentChange(e: CustomEvent) {
    refreshEmptyState();
    debouncedPersist();
  }

  const debouncedPersist = debouncer(persist, 1000);

  function persist() {
    const val = $captureStore;
    captureStore.modify({ ...val }, { isPreventBackPropagation: true });
  }
</script>

{#if isSaving}
  <EmptyStatusView isLoadingState={true} loadingText="Saving..." />
  <!-- {:else if $view.isPortrait}
  <div class="w-full h-full flex flex-col">
    <div
      class={cn("w-full", {
        "h-full": isTypeResolved,
        "h-48": !isTypeResolved
      })}
    >
      <Writer />
    </div>
  </div> -->
  <!-- {:else if captureType === CaptureType.UPLOAD && !($context.isEmbed && $context.os === OperatingSystem.IOS)}
  <FileUploader on:cancel={reset} /> -->
{:else if captureType === CaptureType.CAMERA && dev_iosCameraCaptureMethod === "input" && $context.isEmbed && $context.os === OperatingSystem.IOS}
  <!-- <CameraCaptureUsingInput 
    {captureStore}
  /> -->
  <input
    bind:this={cameraCaptureRef}
    type="file"
    accept="image/*"
    capture="environment"
    on:change={handleCapture}
    on:cancel={onCameraCancel}
    id="cameraInput"
    class="hidden"
  />
{:else}
  {#key $captureStore.refreshId}
    <div class="w-full h-full flex justify-center">
      <div class="w-full max-w-5xl h-full flex flex-col p-4 bg-bgs1">
        {#if captureType !== CaptureType.AUDIO && captureType !== CaptureType.CAMERA && captureType !== CaptureType.UPLOAD}
          <header
            class={cn("flex justify-between gap-4 items-center w-full", {
              "px-12": !$view.isConstrainedWidth
            })}
          >
            <div class="flex gap--4 grow">
              <!-- TODO - if nodularized and type is added to a heading node, then replace "root" with the heading node id -->
              <!-- <NodeAvatar {types} /> -->
              <div class="text-h3 font-medium w-full">
                <TextInput
                  bind:value={$captureStore.label}
                  style={InputStyle.PLAIN}
                  id="capture-title"
                  isExperimentalMdInput={true}
                  placeholder="Untitled"
                  isPreventDefaultOnEnter={true}
                  on:change={refreshEmptyState}
                  on:debouncedChange={persistLabel}
                  on:enter={onTitleEnter}
                  on:keydown={(e) => {
                    const event = e.detail;
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      writerRef?.focus();
                    }
                  }}
                />
              </div>
            </div>
            <div class="flex cw:gap-2 gap-3 items-center h-full">
              {#if !isEmptyState}
                {#if !$view.isConstrainedWidth && dev_isShowDraftSaveFeedback}
                  <div class="flex items-center gap-1">
                    <Icon
                      icon={$captureStore.isRefreshing
                        ? "svg-spinners:90-ring-with-bg"
                        : "ph:check-circle-fill"}
                      size={Size.sm}
                      class="stroke-fgs3"
                    />
                    <span class="text-fgs3 whitespace-nowrap text-b3">
                      {$captureStore.isRefreshing ? "saving..." : "draft saved"}
                    </span>
                  </div>
                {/if}
                {#if $view.isConstrainedWidth}
                  <Toggle
                    icon="ph:link-light"
                    bind:on={isLinksExpanded}
                    bgSize={Size.sm}
                  />
                {:else}
                  <Tag
                    label="Links"
                    icon="ph:link-light"
                    isActive={isLinksExpanded}
                    count={resolveDirectLinksCount($captureStore.links)}
                    isShowExpandFeedbackOnActive={true}
                    isRemovable={false}
                    on:click={() => (isLinksExpanded = !isLinksExpanded)}
                  />
                {/if}
                <div class="h-full py-2">
                  <Divider
                    orientation={Orientation.Vertical}
                    colorStrength={ColorStrength.Strong}
                  />
                </div>
                <Button
                  label={$view.isConstrainedWidth ? undefined : "Save"}
                  type={ButtonVariant.PRIMARY}
                  size={Size.sm}
                  style={ButtonStyle.OUTLINED}
                  isPreventMinWidth={true}
                  icon="ph:floppy-disk"
                  on:click={onSave}
                />
                <Button
                  label={$view.isConstrainedWidth ? undefined : "Clear"}
                  style={ButtonStyle.OUTLINED}
                  isPreventMinWidth={true}
                  size={Size.sm}
                  icon="ph:x-light"
                  on:click={reset}
                />
              {/if}
            </div>
          </header>
        {/if}
        {#if (!isEmptyState || isCaptureFromCollectionPage) && (isLinksExpanded || captureType === CaptureType.AUDIO || captureType === CaptureType.CAMERA || captureType === CaptureType.UPLOAD)}
          <div
            class={cn("w-full py-3 h-fit", {
              "dp:px-10":
                captureType !== CaptureType.AUDIO &&
                captureType !== CaptureType.CAMERA &&
                captureType !== CaptureType.UPLOAD
            })}
          >
            <LinkboxOnCapture
              {captureStore}
              on:linked={onLink}
              on:unlinked={onUnlink}
              expand={expandedType}
            />
          </div>
        {/if}
        {#if isProcessingClipboard}
          <div
            class="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-transparent via-bgs2 to-transparent p-2"
          >
            <Icon
              icon="svg-spinners:3-dots-fade"
              size={Size.sm}
              class="stroke-fgs3"
            />
            <span class="text-fgs3"> Processing... </span>
          </div>
        {/if}
        <main class="flex flex-col gap-6 w-full flex-grow">
          <!-- {#if types && types.length > 0}
            {#key types.map((x) => x.id).join(",")}
              <PropertiesListView
                context="capture"
                {types}
                values={$captureStore.properties}
                bind:isCollapsed={isPropertiesCollapsed}
                on:change={propagatePropertyChanges}
              />
            {/key}
          {/if} -->
          <div
            class={cn("w-full", {
              "h-48": isEmptyState,
              "h-full": !isEmptyState
            })}
          >
            {#if captureType === CaptureType.UPLOAD && !($context.isEmbed && $context.os === OperatingSystem.IOS)}
              <FileUploader {captureStore} on:cancel={reset} />
            {:else}
              <Writer
                {captureType}
                {captureStore}
                bind:isEmptyState
                bind:this={writerRef}
                bind:isSaveInProgress={isSaving}
                on:change={onContentChange}
                on:cancel={reset}
              />
            {/if}
          </div>
          {#if isEmptyState}
            <div class="w-full dp:px-10 dp:my-10">
              <TypeSelector
                bind:selected={captureType}
                isCapturePage={true}
                isHideTypeShortcuts={isCaptureFromCollectionPage}
                on:select={onTypeSelect}
                on:capture={(e) => {
                  handleCapture(e.detail);
                }}
              />
              <CaptureDraftsAction
                on:select={(e) => {
                  captureId = e.detail.id;
                  captureStore = ActiveCaptureStore.resolve(captureId);
                  captureStore.init(e.detail);
                  isEmptyState = false;
                }}
              />
            </div>
          {/if}
        </main>

        {#if isEmptyState && $view.isConstrainedWidth}
          <div
            class="w-full flex justify-center mb-5"
            in:fly={{ y: -100, duration: 250 }}
          >
            <!-- <Button
              icon="ph:x-light"
              on:click={reset}
              style={ButtonStyle.OUTLINED}
              size={Size.lg}
            /> -->
            <button
              class="flex w-12 h-12 text-fgs3 hover:bg-bgs3 bg-bgs2 rounded-full items-center justify-center"
              on:click={reset}
            >
              <Icon icon="ph:x-light" />
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/key}
{/if}

<ComponentBaseLayer hasDragAndDrop={!isWindowDnD} />
