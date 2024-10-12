<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
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
  import { Transcriber } from "$lib/client/utils/taco.utils";
  import {
    TacoActions,
    TranscriptionModel
  } from "$lib/client/types/taco.types";
  import { currentUserId } from "../capture/capture.store";
  import { nodeStore } from "../node/node.store";
  import { Audio2MD } from "./AudioToMarkdown.utils";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { tacoWorker } from "../memotron.store";
  import { read_audio } from "@xenova/transformers";

  export let body: any = {};
  export let url: string;
  export let nodeId: string = "dummy";
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
      value: TranscriptionModel.TINy_EN,
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
   * To Transcribe the audio, shows necessary feedback on transcription start, end and also on error.
   * Auto Refreshes the page the dispplay the content once transcription is completed
   * TODO - move to store, lambda url - env
   */
  async function onTranscribe(): Promise<string | null> {
    isDisabled = true;
    let result: string | null = null;
    try {
      logger.debug({
        at: "AudioContent.svelte - onTranscribe",
        url,
        model
      });
      // const result = await Transcriber.transcribe(url, model);
      const audioData = await read_audio(url, 16000);
      tacoWorker.postMessage({
        action: TacoActions.GET_TRANSCRIPTION,
        params: {
          audioData: audioData,
          model: model
        }
      });
      const result = await new Promise((resolve, reject) => {
        tacoWorker.onmessage = (e) => {
          resolve(e.data);
        };
      });
      logger.debug({
        at: "AudioContent.svelte - onTranscribe",
        result
      });
      const resp = await nodeStore.modify(nodeId, {
        body: { transcription: result, initTranscription: false }
      });
    } catch (error) {
      console.error("Network or JSON parsing error:", error);
      isError = true;
      setTimeout(() => (isError = false), 3000);
      isDisabled = false;
    } finally {
      isDisabled = false;
      return result;
    }
  }

  /**
   * Converts the audio to markdown. IF trnscript already exists, it uses that instead of re-transcribing. It retranscibes in situations where the model Accuracy has been swithced
   */
  async function convertToMarkdown() {
    let transcript: string | null;
    if (
      body?.transcription &&
      $userPreferences.lastUsedTranscriptionModel === model
    )
      transcript = body.transcription;
    else transcript = await onTranscribe();
    if (!transcript || typeof transcript !== "string") return;
    $userPreferences.lastUsedTranscriptionModel = model;
    const mdBlocks = Audio2MD.convertAudioToMarkdown(transcript);
    const resp = await nodeStore.modify(nodeId, {
      body: { mdBlocks }
    });
    dispatch("refresh");
  }
  /**
   * @description Creates wavesurfer instance for preview and uses timeline plugin to add timeline to the interactive visualization.
   */
  function createWaveSurferForPreview() {
    if (wavesurferPreview) {
      wavesurferPreview.destroy();
    }

    wavesurferPreview = WaveSurfer.create({
      container: "#audioCapturePreview",
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
      <div id="audioCapturePreview" class="w-full" />
      <div class="flex justify-between px-0.5 text-fgs2">
        <span>
          {formatSeconds(previewCountDown, TimeFormat.CLOCK)}
        </span>
        <span>
          {formatSeconds(previewTotalDuration, TimeFormat.CLOCK)}
        </span>
      </div>
    </div>
    <div class="flex w-full justify-center gap-6">
      {#if recordingState === PlayActionState.STOPPED}
        <Button
          on:click={() => {
            recordingState = PlayActionState.PREVIEWING;
            wavesurferPreview.play();
          }}
          type={ButtonVariant.PRIMARY}
          icon="ph:play-thin"
          label="Play"
        />
      {:else if recordingState === PlayActionState.PREVIEWING}
        {#if previewingState === PlayActionState.RESUMEPREVIEWING}
          <Button
            on:click={() => {
              wavesurferPreview.pause();
              previewingState = PlayActionState.PAUSEPREVIEWING;
            }}
            type={ButtonVariant.PRIMARY}
            icon="ph:pause-thin"
            label="Pause"
          />
        {:else}
          <Button
            on:click={() => {
              wavesurferPreview.play();
              previewingState = PlayActionState.RESUMEPREVIEWING;
            }}
            type={ButtonVariant.PRIMARY}
            icon="ph:play-thin"
            label="Resume"
          />
        {/if}
      {/if}
      {#if $userPreferences.localAI.audioTranscription}
        <Button
          on:click={convertToMarkdown}
          {isDisabled}
          icon="document-text"
          {label}
        />
      {/if}
    </div>
  </div>
  <div
    class="flex flex-col w-full flex-1 items-center gap-6 border border-brs2 rounded-md bg-bgs2 bg-opacity-30 py-4"
  >
    <div class="flex w-full justify-between gap-3 px-10">
      <Text content="Transcription" style={TextStyle.PANEL_HEADING} />
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
    </div>
    <div class="flex w-full flex-1 pr-10 overflow-y-auto">
      <p class="p-2 text-center text-rose-700" class:hidden={!isError}>
        Transcription Error.
      </p>
      {#if body?.initTranscription == true || isDisabled}
        <p class="p-2">Transcribing...</p>
      {:else if body?.mdBlocks !== undefined}
        <NodularMarkdown
          mdId={generateUID()}
          isNodular={true}
          md={{ blocks: body?.mdBlocks }}
          on:change={onMarkdownChange}
        />
      {:else if body?.transcription !== undefined}
        <TextArea bind:value={body.transcription} />
        <!-- <p class="p-2">{body.transcription}</p> -->
      {:else}
        <span class="w-full h-full flex justify-center items-center text-fgs3">
          Not transcribed yet. Please transcribe to view.</span
        >
      {/if}
    </div>
  </div>
</div>
