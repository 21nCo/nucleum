<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { createEventDispatcher } from "svelte";
  import NodularMarkdown from "$lib/client/components/markdown/NodularMarkdown.svelte";
  import { nodeStore } from "../node/node.store";
  import { InputStyle } from "$lib/client/types/input.type";
  import view from "$lib/client/stores/view.store";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { type IJobStatus } from "$lib/client/components/taco/taco.type";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import TranscriptionWithTimestamps from "./TranscriptionWithTimestamps.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { copyToClipboard } from "$lib/client/utils/utils";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import { toasts } from "$lib/client/stores/notification.store";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { AudioView } from "./audio.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { generateMarkdownText } from "../node/node.utils";
  import type { IAudioBody, IAudioMetadata } from "../node/node.type";
  const dispatch = createEventDispatcher();

  export let body: IAudioBody;
  export let nodeId: string;
  export let metadata: IAudioMetadata;
  export let selectedView: AudioView = AudioView.TRANSCRIPTION;
  export let transcriptionStatus: IJobStatus | null = null;
  export let transcriptionProgress: number = 0;
  export let previewCountDown: number = 0;
  export let errorMessage: string | null = null;
  export let isTranscribeAvailable: boolean = false;

  const isEnableSummarization = import.meta.env?.DEV;
  const isShowTranscriptionProgress = import.meta.env?.DEV;

  // Search functionality
  let isSearchExpanded: boolean = false;
  let searchQuery: string = "";
  let searchInputRef: TextInput;

  function toggleSearch() {
    isSearchExpanded = !isSearchExpanded;
    if (isSearchExpanded) {
      setTimeout(() => {
        searchInputRef?.focus();
      }, 100);
    } else {
      searchQuery = "";
    }
  }

  function highlightSearchMatches(text: string, query: string): string {
    if (!query || !text) return text;
    const regex = new RegExp(
      query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi"
    );
    return text.replace(regex, (match) => "`**" + match + "**`");
  }

  function removeTimestamps(text: string): string {
    if (!text) return "";
    // Remove timestamp patterns like [0.00 - 5.32]
    return text.replace(/\[\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\]/g, "").trim();
  }

  function copyTranscription() {
    if (!body?.transcription) return;
    if (selectedView === AudioView.TRANSCRIPTION) {
      const cleanText = removeTimestamps(body.transcription);
      copyToClipboard(cleanText);
      toasts.success("Transcription copied to clipboard");
    } else if (selectedView === AudioView.SUMMARY && body.summary) {
      copyToClipboard(body.summary);
      toasts.success("Summary copied to clipboard");
    } else if (selectedView === AudioView.MARKDOWN && body.mdBlocks) {
      const markdownAsText = generateMarkdownText(body.mdBlocks);
      copyToClipboard(markdownAsText);
      toasts.success("Markdown copied to clipboard");
    }
  }

  async function onMarkdownChange(event: any) {
    if (!event?.detail?.md?.blocks) return;
    const resp = await nodeStore.modify(
      nodeId,
      {
        body: { mdBlocks: event.detail.md.blocks }
      },
      {
        isDebounced: true,
        debounceKey: "audio-markdown-change"
      }
    );
  }

  function hasTimestamps(transcription: string): boolean {
    if (!transcription) return false;
    const timestampRegex = /\[\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\]/;
    return timestampRegex.test(transcription);
  }

  function handleSeek(event: any) {
    dispatch("seek", event.detail);
  }

  function resolveViewItems() {
    let items = [
      {
        value: AudioView.TRANSCRIPTION,
        label: "Transcription",
        icon: "ph:file-text-light"
      },
      {
        value: AudioView.MARKDOWN,
        label: "Markdown",
        icon: "ph:markdown-logo-light"
      }
    ];
    if (isEnableSummarization) {
      items.push({
        value: AudioView.SUMMARY,
        label: "Summary",
        icon: "ph:sparkle-light"
      });
    }
    if ($view.isConstrainedWidth) {
      return items.map((item) => ({
        ...item,
        icon: undefined
      }));
    }
    return items;
  }
</script>

<div
  class="flex flex-col w-full flex-1 overflow-auto items-center cw:gap-2 gap-4 border- border-brs2 rounded-md bg--bgs2 bg--opacity-30 py-2"
>
  <div class="cw:flex cw:justify-between grid grid-cols-3 w-full gap-3 px-3">
    <!-- <Text content="Transcription" style={TextStyle.PANEL_HEADING_SMALL} /> -->
    {#if !$view.isConstrainedWidth}
      <span />
    {/if}
    <div class="flex justify-center">
      <PanelSwitcher
        items={resolveViewItems()}
        bind:value={selectedView}
        style={PanelSwitcherStyle.TRAIN}
        size={Size.sm}
        isRenderDropdownForCW={true}
      />
    </div>
    <div class="flex items-center gap-2 justify-end">
      {#if isSearchExpanded}
        <div class="flex items-center gap-2">
          <TextInput
            bind:this={searchInputRef}
            bind:value={searchQuery}
            placeholder="Search transcription..."
            size={Size.sm}
            style={InputStyle.PLAIN}
            icon="ph:magnifying-glass-light"
            isShowClearControl={searchQuery !== ""}
            on:cancel={() => {
              searchQuery = "";
            }}
          />
          <Button
            icon="ph:x-light"
            tooltip="Close search"
            on:click={toggleSearch}
          />
        </div>
      {:else if selectedView === AudioView.TRANSCRIPTION && body?.transcription}
        <Button
          icon="ph:magnifying-glass-light"
          tooltip="Search transcription"
          on:click={toggleSearch}
        />
        {#if import.meta.env?.DEV}
          <Button
            icon="ph:code-light"
            tooltip="Reparse markdown"
            on:click={() => {
              dispatch("reparse");
            }}
          />
        {/if}
        {#if isTranscribeAvailable}
          <Button
            icon="ph:arrow-counter-clockwise-light"
            tooltip="Retranscribe"
            on:click={() => {
              dispatch("retranscribe");
            }}
          />
        {/if}
      {/if}
      {#if !isSearchExpanded}
        {#if body?.transcription}
          <Button
            icon="copy"
            tooltip={selectedView === AudioView.TRANSCRIPTION
              ? "Copy transcription"
              : selectedView === AudioView.SUMMARY
                ? "Copy summary"
                : "Copy markdown"}
            on:click={copyTranscription}
          />
        {/if}
        {#if isTranscribeAvailable}
          <Button
            icon="ph:sliders-light"
            tooltip="Transcription settings"
            on:click={() => {
              appStore.runAction(Action.ARTIFICIAL_INTELLIGENCE);
            }}
          />
        {/if}
      {/if}
    </div>
  </div>
  <div class="flex w-full flex-1 overflow-auto">
    {#if errorMessage}
      <InlineErrorMessage error={errorMessage} isDissappear={false} />
    {:else if selectedView === AudioView.MARKDOWN}
      {#if !body?.mdBlocks}
        <EmptyStatusView
          mainText="Markdown not available"
          subText="Please transcribe the audio to view the markdown."
        />
      {:else}
        <div class="cw:px-2 cw:pr-2 pr-10 overflow-auto">
          <NodularMarkdown
            mdId={generateSimpleRandomId()}
            isNodular={true}
            md={{ blocks: body?.mdBlocks }}
            on:change={onMarkdownChange}
          />
        </div>
      {/if}
    {:else if selectedView === AudioView.TRANSCRIPTION}
      {#if body?.transcription !== undefined && body?.initTranscription !== true}
        <div class="cw:px-2 px-3 w-full h-full">
          {#if body.transcription && hasTimestamps(body.transcription)}
            <TranscriptionWithTimestamps
              transcription={searchQuery && searchQuery.length > 1
                ? highlightSearchMatches(body.transcription, searchQuery)
                : body.transcription}
              currentTime={previewCountDown}
              groupSegments={true}
              maxGroupGapSeconds={3}
              minGroupDuration={8}
              on:seek={handleSeek}
            />
          {:else if searchQuery && searchQuery.length > 1 && body.transcription}
            {@html renderMdAsHtml(
              highlightSearchMatches(body.transcription, searchQuery)
            )}
          {:else if body.transcription}
            <p>{body.transcription}</p>
          {/if}
        </div>
      {:else}
        <div class="w-full h-full cw:px-2 px-3">
          <div
            class="flex items-center justify-center gap-2 p-2 w-full h-full rounded-md border border-brs2"
          >
            {#if body?.initTranscription === true && transcriptionStatus?.status === "running"}
              <div class="flex flex-col items-center justify-center gap-2">
                <div class="flex gap-2">
                  <Icon icon="svg-spinners:3-dots-fade" />
                  <span class="text-fgs3">
                    {#if body?.transcription}
                      Retranscribing...
                    {:else}
                      Transcribing...
                    {/if}
                    {#if isShowTranscriptionProgress && transcriptionProgress > 0}
                      {transcriptionProgress}%
                    {/if}
                  </span>
                </div>
                <span class="text-fgs3 text-b3 text-center">
                  Audio > 5 minutes will take longer to transcribe if bigger
                  models are used. Please come back later to view the
                  transcription.
                </span>
              </div>
            {:else if body?.transcription}
              <p>{body.transcription}</p>
            {:else}
              {@const isOverDurationLimit =
                metadata?.duration && metadata?.duration > 10 * 60}
              <EmptyStatusView
                mainText={isTranscribeAvailable
                  ? "Not transcribed yet"
                  : isOverDurationLimit
                    ? "Audio too long"
                    : "Transcription not available"}
                subText={isTranscribeAvailable
                  ? "Please click on transcribe to start the transcription."
                  : isOverDurationLimit
                    ? "Transcription is currently not available for audio longer than 15 minutes"
                    : "Transcription is not available on this platform yet. Please use the transcription feature from iOS or macOS apps."}
                actionText={isTranscribeAvailable ? "Transcribe" : undefined}
                size={Size.sm}
                isNotAvailableContext={!isTranscribeAvailable}
                on:click={() => {
                  dispatch("transcribe");
                }}
              />
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>
  <!-- {#if isTranscribeAvailable}
<div class="text-b3 text-fgs3 px-2">
  Note: Transcription is currently only available for English language.
  We are working to expand this to other languages.
</div>
{/if} -->
</div>
