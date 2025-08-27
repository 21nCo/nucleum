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
  import { nodeStore } from "../node/node.store";
  import { Audio2MD } from "./AudioToMarkdown.utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  import view from "$lib/client/stores/view.store";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Taco } from "$lib/client/components/taco/taco";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import { isRecordId } from "$lib/client/components/flux/resourceStores/resource.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import type { IJobStatus } from "$lib/client/components/taco/taco.type";
  import { AudioView } from "./audio.type";
  import AudioContentMainPanel from "./AudioContentMainPanel.svelte";
  import { preferences } from "$lib/client/stores/preferences/preferences.store";
  import { Preference } from "$lib/client/stores/preferences/preferences.type";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
  import { Size } from "$lib/client/types/size.enum";
  import type { IAudioBody, IAudioMetadata } from "../node/node.type";

  export let body: IAudioBody = {};
  export let url: string;
  export let nodeId: string = "dummy";
  export let metadata: IAudioMetadata = {};
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;

  const _previewId = generateSimpleRandomId();
  const currentColors: any = retrieveCurrentColors($appearance);
  const dispatch = createEventDispatcher();
  let wavesurferPreview: WaveSurfer;
  let previewCountDown: number = 0;
  let previewTotalDuration: number = metadata?.duration || 0;
  let recordingState: PlayActionState = PlayActionState.STOPPED;
  let previewingState:
    | PlayActionState.PAUSEPREVIEWING
    | PlayActionState.RESUMEPREVIEWING = PlayActionState.RESUMEPREVIEWING;

  let transcriptionProgress: number = 0;
  let transcriptionStatus: IJobStatus | null = null;
  const defaultErrorMessage =
    "Failed to transcribe audio. Please try again. Please note that only .wav audio files are currently supported for transcription.";
  let errorMessage: string | null = null;
  let isPreviewLoading: boolean = true;
  let selectedView: AudioView = AudioView.TRANSCRIPTION;

  $: isTranscribeAvailable =
    accessPoint === ResourceAccessPoint.SELF &&
    $context.isEmbed &&
    !!metadata?.duration &&
    metadata?.duration <= 15 * 60;

  /**
   * Initiates audio transcription using iOS ML service
   */
  async function initiateTranscription() {
    let jobId: string | null = null;
    try {
      logger.log({
        at: "AudioContent.svelte - initiateTranscription",
        url
      });
      const model =
        preferences.resolve(Preference.TRANSCRIPTION_MODEL) || "tiny";
      const taco = Taco.getInstance();
      const result = await taco.initiateTranscriptionUsingCoreML(url, {
        model
      });
      if (
        result &&
        typeof result === "object" &&
        "jobId" in result &&
        result.jobId
      ) {
        jobId = result.jobId as string;
      }
      logger.log({
        at: "AudioContent.svelte - initiateTranscription",
        result,
        jobId
      });
      await nodeStore.modify(
        nodeId,
        {
          body: { transcriptionJobId: jobId, initTranscription: true }
        },
        { isPreventBackPropagation: true }
      );
      if (body) body.initTranscription = true;
      if (jobId) {
        pollTranscriptionStatus(jobId);
      }
    } catch (error) {
      console.error("Transcription error:", error);
      errorMessage = defaultErrorMessage;
    }
  }

  /**
   * Polls for transcription status and updates UI
   */
  async function pollTranscriptionStatus(jobId: string) {
    try {
      const taco = Taco.getInstance();
      const jobResult = await taco.retrieveJob(jobId);
      transcriptionStatus = jobResult;
      logger.log({
        at: "AudioContent.svelte - pollTranscriptionStatus",
        jobResult
      });
      if (
        jobResult.status === "completed" &&
        jobResult.output &&
        typeof jobResult.output === "object" &&
        "transcription" in jobResult.output &&
        typeof jobResult.output.transcription === "string"
      ) {
        const transcription = jobResult.output.transcription;
        const mdBlocks = Audio2MD.convertAudioToMarkdown(transcription);
        await nodeStore.modify(nodeId, {
          body: {
            transcription,
            mdBlocks,
            transcriptionUpdatedAt: new Date().toISOString(),
            initTranscription: false,
            transcriptionJobId: null
          },
          text: transcription
        });
        dispatch("refresh");
      } else if (jobResult.status === "failed") {
        errorMessage = defaultErrorMessage;
      } else if (jobResult.status === "running") {
        transcriptionProgress = (jobResult.progress || 0) * 100;
        setTimeout(() => pollTranscriptionStatus(jobId), 1000);
      }
    } catch (error) {
      console.error("Status check error:", error);
      errorMessage = defaultErrorMessage;
    }
  }

  /**
   * @description Creates wavesurfer instance for preview and uses timeline plugin to add timeline to the interactive visualization.
   */
  function createWaveSurferForPreview() {
    if (wavesurferPreview) {
      wavesurferPreview.destroy();
    }

    isPreviewLoading = true;
    const timelineSettings = resolveTimelineStopSettings();

    wavesurferPreview = WaveSurfer.create({
      container: `#${_previewId}`,
      waveColor: currentColors["aps2"],
      progressColor: currentColors["aps1"],
      barWidth: 2,
      barGap: 2,
      dragToSeek: true,
      height: $view.isConstrainedWidth ? 32 : 64,
      plugins: [TimelinePlugin.create(timelineSettings)],
      url: url
    });

    wavesurferPreview.on("decode", (duration) => {
      previewTotalDuration = duration;
      isPreviewLoading = false;
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
    const isAutoTranscribe =
      preferences.resolve(Preference.AUTO_TRANSCRIBE) || false;
    if (body?.transcriptionJobId) {
      pollTranscriptionStatus(body.transcriptionJobId);
    } else if (
      isAutoTranscribe &&
      !body?.transcription &&
      !body?.initTranscription &&
      isTranscribeAvailable
    ) {
      await initiateTranscription();
    }
  });

  onDestroy(() => {
    if (wavesurferPreview) {
      wavesurferPreview.destroy();
    }
  });

  function resolveTimelineStopSettings() {
    const audioDuration = metadata?.duration || 0;
    let timeInterval = 60;
    if (audioDuration) {
      if (audioDuration > 7200) {
        timeInterval = 1200;
      } else if (audioDuration > 3600) {
        timeInterval = 300;
      } else if (audioDuration > 1800) {
        timeInterval = 240;
      } else if (audioDuration > 1200) {
        timeInterval = 120;
      } else if (audioDuration > 600) {
        timeInterval = 60;
      } else if (audioDuration > 300) {
        timeInterval = 30;
      } else if (audioDuration > 120) {
        timeInterval = 15;
      } else if (audioDuration > 60) {
        timeInterval = 10;
      } else {
        timeInterval = 5;
      }
    }
    if ($view.isConstrainedWidth) {
      timeInterval = timeInterval * 4;
    }
    const primaryLabelInterval = timeInterval * 2;
    const secondaryLabelInterval = timeInterval;
    return {
      timeInterval,
      primaryLabelInterval,
      secondaryLabelInterval
    };
  }

  function handleSeek(event: any) {
    if (wavesurferPreview && event.detail?.time !== undefined) {
      wavesurferPreview.setTime(event.detail.time);
      if (recordingState === PlayActionState.STOPPED) {
        recordingState = PlayActionState.PREVIEWING;
        wavesurferPreview.play();
      }
    }
  }

  async function reParseMarkdown() {
    if (!body?.transcription) return;
    const mdBlocks = Audio2MD.convertAudioToMarkdown(body?.transcription);
    body.mdBlocks = mdBlocks;
    console.log({ mdBlocks, transcription: body?.transcription });
    await nodeStore.modify(
      nodeId,
      {
        body: { mdBlocks }
      },
      {
        isPreventBackPropagation: true
      }
    );
  }
</script>

<div class="relative flex flex-col justify-start w-full h-full">
  <div class="flex flex-col gap-2 w-full p-2">
    <div
      class="flex flex-col gap-2 w-full text-justify border- border-brs3 rounded-md py-2 p-3 mo:pt-12"
    >
      <div class="flex flex-col gap-2 w-full">
        <div class="w-full flex gap-2 mo:flex--col justify-center items-center">
          {#if isRecordId(metadata?.picture)}
            <div class="w-12 dp:w-24">
              <FileView
                id={metadata?.picture}
                class="w-full h-full object-cover rounded-md"
              />
            </div>
          {/if}
          <div class="relative w-full cw:min-h-14 min-h-20">
            {#if isPreviewLoading && true}
              <div
                class="absolute inset-0 flex items-center justify-center gap-2 p-4 w-full"
              >
                <Icon icon="svg-spinners:3-dots-fade" />
                <span class="text-fgs3 text-b2">Loading...</span>
              </div>
            {/if}
            <div id={_previewId} class="audio-preview-container w-full" />
          </div>
        </div>
        <div class="flex justify-between px-0.5 text-fgs2 tabular-nums">
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
      <div class="flex w-full justify-center gap-3">
        <Button
          on:click={(e) => {
            e?.stopPropagation();
            wavesurferPreview.setTime(previewCountDown - 10);
          }}
          style={ButtonStyle.OUTLINED}
          icon="solar:rewind-10-seconds-back-linear"
          tooltip="Backward (10 sec)"
        />
        {#if recordingState === PlayActionState.STOPPED}
          <Button
            on:click={(e) => {
              e?.stopPropagation();
              recordingState = PlayActionState.PREVIEWING;
              wavesurferPreview.play();
            }}
            type={ButtonVariant.PRIMARY}
            style={ButtonStyle.OUTLINED}
            icon="play"
            tooltip="Play"
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
              style={ButtonStyle.OUTLINED}
              icon="pause"
              tooltip="Pause"
            />
          {:else}
            <Button
              on:click={(e) => {
                e?.stopPropagation();
                wavesurferPreview.play();
                previewingState = PlayActionState.RESUMEPREVIEWING;
              }}
              type={ButtonVariant.PRIMARY}
              style={ButtonStyle.OUTLINED}
              icon="play"
              tooltip="Resume"
            />
          {/if}
        {/if}
        <Button
          on:click={(e) => {
            e?.stopPropagation();
            wavesurferPreview.setTime(previewCountDown + 10);
          }}
          style={ButtonStyle.OUTLINED}
          icon="solar:rewind-10-seconds-forward-linear"
          tooltip="Forward (10 sec)"
        />
      </div>
    </div>
  </div>

  {#if accessPoint === ResourceAccessPoint.SELF}
    <AudioContentMainPanel
      {body}
      {nodeId}
      {selectedView}
      {previewCountDown}
      {transcriptionStatus}
      {transcriptionProgress}
      {isTranscribeAvailable}
      {metadata}
      {errorMessage}
      on:seek={handleSeek}
      on:transcribe={initiateTranscription}
      on:retranscribe={initiateTranscription}
      on:reparse={reParseMarkdown}
    />
  {/if}
</div>
