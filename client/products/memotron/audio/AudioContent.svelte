<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { PlayActionState } from "$lib/client/types/event.enum";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import WaveSurfer from "wavesurfer.js";
  import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline";
  import NodularMarkdown from "$lib/client/components/markdown/NodularMarkdown.svelte";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import TextArea from "$lib/client/elements/input/TextArea.svelte";
  import { generateUID } from "$lib/client/utils/utils";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { currentUserId } from "../capture/capture.store";
  import { nodeStore } from "../node/node.store";
  import { Audio2MD } from "./AudioToMarkdown.utils";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { read_audio } from "@huggingface/transformers";
  import {
    Taco,
    TranscriptionModel,
    type TranscriptionStatus
  } from "$lib/client/components/taco/taco";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import { isRecordId } from "$lib/client/components/flux/resourceStores/resource.utils";
  import Icon from "$lib/client/elements/Icon.svelte";

  export let body: any = {};
  export let url: string;
  export let nodeId: string = "dummy";
  export let metadata: any = {};
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  const _previewId = generateSimpleRandomId();
  let isDisabled: boolean = body?.initTranscription == true ? true : false;
  let label: string =
    body?.initTranscription == false ? "Re-Transcribe" : "Text";
  let userId = currentUserId.split(":")[1];
  const currentColors: any = retrieveCurrentColors($appearance);
  const dispatch = createEventDispatcher();
  let wavesurferPreview: WaveSurfer;
  let previewCountDown: number = 0;
  let previewTotalDuration: number = 0;
  let recordingState: PlayActionState = PlayActionState.STOPPED;
  let previewingState:
    | PlayActionState.PAUSEPREVIEWING
    | PlayActionState.RESUMEPREVIEWING = PlayActionState.RESUMEPREVIEWING;
  let isError: boolean = false;
  let transcriptionProgress: number = 0;
  let transcriptionStatus: TranscriptionStatus | null = null;

  $: isTranscribeEnabled =
    // $userPreferences.localAI.audioTranscription &&
    accessPoint === ResourceAccessPoint.SELF;

  $: isTranscribeAvailable = $context.os !== OperatingSystem.IOS;

  let isConvertToMarkdown: boolean = false;
  // let modelOptions: string[] = [
  //   "tiny",
  //   "tiny.en",
  //   "base",
  //   "base.en",
  //   "small",
  //   "small.en"
  // ];
  let accuracy: DropdownItem[] = [
    {
      value: TranscriptionModel.TINY_EN,
      label: "Moderate (Fast Response time)"
    },
    {
      value: TranscriptionModel.BASE_EN,
      label: "Optimal"
    },
    {
      value: TranscriptionModel.SMALL_EN,
      label: "High"
    },
    {
      value: TranscriptionModel.MEDIUM_EN,
      label: "Precise (Lower speed)"
    }
  ];

  let model: TranscriptionModel = $userPreferences.lastUsedTranscriptionModel;

  /**
   * Initiates audio transcription using iOS ML service
   */
  async function initiateTranscription() {
    isDisabled = true;
    let jobId: string | null = null;
    try {
      logger.debug({
        at: "AudioContent.svelte - initiateTranscription",
        url
      });
      const taco = Taco.getInstance();
      jobId = await taco.initiateTranscriptionUsingCoreML(url);

      logger.debug({
        at: "AudioContent.svelte - initiateTranscription",
        jobId
      });

      // Save job ID to node
      await nodeStore.modify(nodeId, {
        body: { transcriptionJobId: jobId, initTranscription: true }
      });

      // Start polling for status
      pollTranscriptionStatus(jobId);
    } catch (error) {
      console.error("Transcription error:", error);
      isError = true;
      setTimeout(() => (isError = false), 3000);
      isDisabled = false;
    }
  }

  /**
   * Polls for transcription status and updates UI
   */
  async function pollTranscriptionStatus(jobId: string) {
    try {
      const taco = Taco.getInstance();
      const status = await taco.checkTranscriptionStatus(jobId);
      transcriptionStatus = status;

      if (status.status === "completed" && status.transcription) {
        // Convert to markdown
        const mdBlocks = Audio2MD.convertAudioToMarkdown(status.transcription);

        // Save transcription and markdown to node
        await nodeStore.modify(nodeId, {
          body: {
            transcription: status.transcription,
            mdBlocks,
            initTranscription: false,
            transcriptionJobId: null
          }
        });
        isDisabled = false;
        label = "Retranscribe";
        $userPreferences.lastUsedTranscriptionModel = model;
        dispatch("refresh");
      } else if (status.status === "failed") {
        isError = true;
        setTimeout(() => (isError = false), 3000);
        isDisabled = false;
      } else if (status.status === "processing") {
        transcriptionProgress = status.progress || 0;
        // Continue polling
        setTimeout(() => pollTranscriptionStatus(jobId), 1000);
      }
    } catch (error) {
      console.error("Status check error:", error);
      isError = true;
      setTimeout(() => (isError = false), 3000);
      isDisabled = false;
    }
  }

  /**
   * Converts the audio to markdown. If transcript already exists, it uses that instead of re-transcribing.
   */
  async function transcribe() {
    try {
      await initiateTranscription();
    } catch (error) {
      console.error("Markdown conversion error:", error);
      isError = true;
      setTimeout(() => (isError = false), 3000);
    }
  }

  /**
   * @description Creates wavesurfer instance for preview and uses timeline plugin to add timeline to the interactive visualization.
   */
  function createWaveSurferForPreview() {
    if (wavesurferPreview) {
      wavesurferPreview.destroy();
    }

    wavesurferPreview = WaveSurfer.create({
      container: `#${_previewId}`,
      waveColor: currentColors["aps2"],
      progressColor: currentColors["aps1"],
      barWidth: 2,
      barGap: 2,
      dragToSeek: true,
      plugins: [TimelinePlugin.create()],
      url: url
    });

    wavesurferPreview.on("decode", (duration) => {
      previewTotalDuration = duration;
    });
    wavesurferPreview.on("finish", () => {
      recordingState = PlayActionState.STOPPED;
      previewingState = PlayActionState.RESUMEPREVIEWING;
      wavesurferPreview.setTime(0);
    });
    wavesurferPreview.on("timeupdate", (currentTime) => {
      previewCountDown = currentTime;
    });
  }
  onMount(async () => {
    createWaveSurferForPreview();
    isDisabled = body?.initTranscription == true ? true : false;
    label = body?.initTranscription == false ? "Retranscribe" : "Transcribe";

    // If there's an ongoing transcription job, start polling
    if (body?.transcriptionJobId) {
      pollTranscriptionStatus(body.transcriptionJobId);
    }
  });
  onDestroy(() => {
    if (wavesurferPreview) {
      wavesurferPreview.destroy();
    }
  });

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
</script>

<div class="relative flex flex-col gap-8 justify-start w-full h-full p-6">
  <div
    class="flex flex-col gap-2 w-full text-justify border- border-brs3 rounded-md py-2"
  >
    <div class="flex flex-col gap-2 w-full">
      <div class="w-full flex gap-2 mo:flex-col justify-center items-center">
        {#if isRecordId(metadata?.picture)}
          <div class="w-48">
            <FileView
              id={metadata?.picture}
              class="w-full h-full object-cover rounded-md"
            />
          </div>
        {/if}
        <div id={_previewId} class="audio-preview-container w-full" />
      </div>
      <div class="flex justify-between px-0.5 text-fgs2">
        <span>
          {formatSeconds(previewCountDown, TimeFormat.CLOCK)}
        </span>
        <span>
          {formatSeconds(previewTotalDuration, TimeFormat.CLOCK)}
        </span>
      </div>
    </div>

    <!-- <audio controls>
      <source src={url} type="audio/webm" />
    </audio> -->
    <div class="flex w-full justify-center gap-6">
      {#if recordingState === PlayActionState.STOPPED}
        <Button
          on:click={(e) => {
            e?.stopPropagation();
            recordingState = PlayActionState.PREVIEWING;
            wavesurferPreview.play();
          }}
          type={ButtonVariant.PRIMARY}
          icon="ph:play-light"
          label="Play"
        />
      {:else if recordingState === PlayActionState.PREVIEWING}
        {#if previewingState === PlayActionState.RESUMEPREVIEWING}
          <Button
            on:click={(e) => {
              e?.stopPropagation();
              wavesurferPreview.pause();
              previewingState = PlayActionState.PAUSEPREVIEWING;
            }}
            type={ButtonVariant.PRIMARY}
            icon="ph:pause-light"
            label="Pause"
          />
        {:else}
          <Button
            on:click={(e) => {
              e?.stopPropagation();
              wavesurferPreview.play();
              previewingState = PlayActionState.RESUMEPREVIEWING;
            }}
            type={ButtonVariant.PRIMARY}
            icon="ph:play-light"
            label="Resume"
          />
        {/if}
      {/if}
      <!-- TODO - reenable transcription after iOS crash issue fix -->
      {#if isTranscribeEnabled && isTranscribeAvailable}
        <Button
          on:click={transcribe}
          {isDisabled}
          icon="document-text"
          {label}
        />
      {/if}
    </div>
  </div>
  {#if accessPoint === ResourceAccessPoint.SELF}
    <div
      class="flex flex-col w-full flex-1 items-center gap-6 border border-brs2 rounded-md bg-bgs2 bg-opacity-30 py-4"
    >
      <div class="flex w-full justify-between gap-3 mo:px-2 px-10">
        <Text content="Transcription" style={TextStyle.PANEL_HEADING_SMALL} />
        <!-- {#if !$view.isConstrainedWidth}
          <DropDown
            items={accuracy}
            isDisableSearch={true}
            size={Size.sm}
            style={InputStyle.PLAIN}
            label={{
              label: "Accuracy",
              orientation: Orientation.Vertical,
              isShrink: true
            }}
            value={model}
            on:select={(e) => (model = e.detail)}
          />
        {/if} -->
      </div>
      <div
        class={cn("flex w-full flex-1 overflow-y-auto", {
          "pr-10": !$view.isConstrainedWidth && body?.mdBlocks
        })}
      >
        <p class="p-2 text-center text-ars1" class:hidden={!isError}>
          Transcription Error.
        </p>
        {#if body?.initTranscription == true || isDisabled}
          <div class="flex items-center justify-center gap-2 p-2 w-full">
            <Icon icon="svg-spinners:3-dots-fade" />
            <span class="text-fgs3">
              {#if transcriptionStatus?.status === "processing"}
                Transcribing... {transcriptionProgress}%
              {:else}
                Transcribing...
              {/if}
            </span>
          </div>
        {:else if body?.mdBlocks !== undefined}
          <NodularMarkdown
            mdId={generateUID()}
            isNodular={true}
            md={{ blocks: body?.mdBlocks }}
            on:change={onMarkdownChange}
          />
        {:else if body?.transcription !== undefined}
          <TextArea bind:value={body.transcription} style={InputStyle.PLAIN} />
          <!-- <p class="p-2">{body.transcription}</p> -->
        {:else if !isTranscribeAvailable}
          <span
            class="flex w-full justify-center text-fgs3 text-center text-b2 px-2"
          >
            Local AI Transcription is not available on mobile devices including
            iOS and iPadOS yet. Please use desktop to transcribe your audio.
          </span>
        {:else}
          <span
            class="w-full h-full flex flex-col gap-2 justify-center items-center text-fgs3"
          >
            <span> Not transcribed yet. Please transcribe to view. </span>
            <!-- {#if !$userPreferences.localAI.audioTranscription}
              <div class="flex flex-col gap-2 text-b2">
                Please make sure to enable Audio transcription from AI settings
                to transcribe your audio.
                <div class="flex justify-center">
                  <Button
                    label="Open AI settings"
                    size={Size.sm}
                    type={ButtonVariant.PRIMARY}
                    style={ButtonStyle.OUTLINED}
                    on:click={() => {
                      appStore.runAction(Action.LOCAL_AI_SETTINGS, {
                        componentParams: {
                          isCmdBarLaunch: true
                        }
                      });
                    }}
                  />
                </div>
              </div>
            {/if} -->
          </span>
        {/if}
      </div>
      {#if isTranscribeAvailable}
        <div class="text-b3 text-fgs3 px-2">
          Note: Transcription is currently only available for English language.
          We are working to expand this to other languages.
        </div>
      {/if}
    </div>
  {/if}
</div>
