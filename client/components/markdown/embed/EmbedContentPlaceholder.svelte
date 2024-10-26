<script lang="ts">
  import { fileDrop } from "$lib/client/actions/fileDrop.action";
  import { popover } from "$lib/client/actions/popover.action";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
  import { MAX_FILE_SIZE_MB } from "$lib/client/products/memotron/memotron.store";
  import { resolveFileUploadErrorMessage } from "$lib/client/products/memotron/memotron.utils";
  import {
    mediaNodeTypeList,
    NodeType,
    webNodeTypeList
  } from "$lib/client/products/memotron/node/node.type";
  import context from "$lib/client/stores/context.store";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import {
    ButtonStyle,
    ButtonVariant,
    type IButtonParams
  } from "$lib/client/types/button.type";
  import { Embed } from "$lib/client/types/context.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { logger } from "../../debug/logger.client";
  import type { MdStoreType } from "../markdown.store";
  import type { IBlock } from "../md.type";
  import EmbedLibrarySearch from "./EmbedLibrarySearch.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let block: IBlock;
  export let mdStore: MdStoreType;
  export let linkInputValue = "";
  const subType = block?.body?.subType;
  const commonButtonParams: IButtonParams = {
    size: Size.sm,
    style: ButtonStyle.OUTLINED
  };

  const onlyFromLibraryTypes = [
    NodeType.TWEET,
    NodeType.TWITTER_PROFILE,
    NodeType.KINDLE_BOOK,
    NodeType.KINDLE_HIGHLIGHT,
    NodeType.TEXT_CLIP
  ];
  let error: string | undefined = undefined;
  let isSaveInProgress: boolean = false;

  $: label = subType ? enumToString(subType) : undefined;

  function onSelectFromLibrary(event: CustomEvent) {
    if (event.detail.item) dispatch("select", event.detail.item);
  }

  function onLinkInput() {
    dispatch("linkInput", linkInputValue);
  }

  async function handleDrop(
    all: File[],
    valid: File[],
    errors: { file: File; type: string }[]
  ) {
    console.log({ at: "EmbedContentPlaceholder - handleDrop", event });
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
        const result = await captureStore.saveFile(file, undefined, {
          isEmbedContext: true
        });
        if (result) dispatch("select", result);
      } else if (all.length > 1) {
        error = "Multiple files are not supported";
      }
    } catch (e) {
      logger.error({ at: "EmbedContentPlaceholder - handleDrop", error: e });
      error = "Something went wrong";
    } finally {
      isSaveInProgress = false;
    }
  }

  function resoveFileUploadAcceptedFormats() {
    if (!subType) return "*";
    switch (subType) {
      case NodeType.IMAGE:
        return ".jpg,.png,.jpeg,.svg";
      case NodeType.AUDIO:
        return ".wav,.mp3,.m4a,.aac,.flac,.webm";
      case NodeType.PDF:
        return ".pdf";
      case NodeType.VIDEO:
        return ".mp4,.mov,.webm,.ogg";
      default:
        return "*";
    }
  }
</script>

<div
  class={cn(
    "flex flex-col items-center justify-center w-full bg-bgs2 bg-opacity-50 rounded-md border border-dashed border-brs3",
    {
      "mo:h-40 h-52": subType,
      "mo:h-60 h-72": !subType
    }
  )}
  use:fileDrop={{
    accept: resoveFileUploadAcceptedFormats(),
    multiple: false,
    maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    onDrop: handleDrop,
    dragOverClass: ["bg-opacity-100", "border-fgs3"]
  }}
>
  {#if isSaveInProgress}
    <div class="flex items-center justify-center w-full h-full">
      <Icon icon="svg-spinners:3-dots-fade" size={Size.xl} />
    </div>
  {:else}
    <div class="flex flex-col items-center mo:gap-3 gap-4 w-full">
      <span class="flex items-center justify-center gap-2">
        {#if subType === NodeType.IMAGE}
          <Icon icon="ph:image" class="stroke-fgs3" />
        {:else if subType === NodeType.AUDIO}
          <Icon icon="ph:music-note" class="stroke-fgs3" />
        {:else if subType === NodeType.FILE}
          <Icon icon="ph:file-light" class="stroke-fgs3" />
        {:else if subType === NodeType.PDF}
          <Icon icon="ph:file-pdf" class="stroke-fgs3" />
        {:else if subType === NodeType.TWEET || subType === NodeType.TWITTER_PROFILE}
          <Icon icon="ph:x-logo" class="stroke-fgs3" />
        {:else if subType === NodeType.KINDLE_BOOK || subType === NodeType.KINDLE_HIGHLIGHT}
          <Icon icon="ph:book-light" class="stroke-fgs3" />
        {:else if subType === NodeType.YOUTUBE_VIDEO || subType === NodeType.YOUTUBE_CHANNEL}
          <Icon icon="ph:youtube-logo" class="stroke-fgs3" />
        {/if}
        {#if label}
          <span class="text-fgs2 text-b2">{label}</span>
        {/if}
      </span>
      {#if mediaNodeTypeList.includes(subType)}
        <span class="text-fgs2 text-b2">
          {#if $context.embed === Embed.HANDSET}
            Click to browse {label ?? "file"}s
          {:else}
            Drag and drop your {label ?? "files"} here
          {/if}
        </span>
      {/if}
      {#if (webNodeTypeList.includes(subType) && !onlyFromLibraryTypes.includes(subType)) || !subType}
        <button
          class="flex justify-center items-center gap-3 mo:w-full w-1/2"
          on:click|stopPropagation
        >
          <TextInput
            bind:value={linkInputValue}
            placeholder="Type or paste link here"
          />
          <Button label="Go" on:click={onLinkInput} />
        </button>
      {/if}
      {#if !onlyFromLibraryTypes.includes(subType)}
        <div class="w-1/3">
          <Divider isShowOr={true} colorStrength={ColorStrength.Strong} />
        </div>
      {/if}
      <div class="flex items-center justify-center gap-3 w-full">
        {#if mediaNodeTypeList.includes(subType) || !subType}
          {#if subType === NodeType.IMAGE}
            <Button
              label="Capture"
              icon="ph:camera-light"
              {...commonButtonParams}
              type={ButtonVariant.PRIMARY}
            />
          {:else if subType === NodeType.AUDIO}
            <Button
              label="Record"
              icon="ph:microphone-light"
              {...commonButtonParams}
              type={ButtonVariant.PRIMARY}
            />
          {/if}
          <Button
            label="Upload"
            icon="ph:upload-light"
            {...commonButtonParams}
            type={ButtonVariant.PRIMARY}
          />
        {/if}
        <button
          on:click|stopPropagation
          use:popover={{
            content: EmbedLibrarySearch,
            componentProps: {
              subType,
              onSelect: onSelectFromLibrary
            }
          }}
        >
          <Button
            label="Choose from library"
            icon="ph:globe-light"
            {...commonButtonParams}
          />
        </button>
      </div>
      {#if onlyFromLibraryTypes.includes(subType)}
        <span class="text-fgs2 text-b2">
          Note: Only saved {label}s from library can be embedded at the moment.
        </span>
      {/if}
      {#if error}
        <InlineErrorMessage {error} />
      {/if}
    </div>
  {/if}
</div>
