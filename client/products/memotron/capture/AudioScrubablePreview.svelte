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
  import { captureStore, currentUserId } from "./capture.store";
  import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";

  export let body: any = {};
  export let url: string = "";
  export let isReplaceable: boolean = false;
  export let nodeId: string = "dummy";
  url = body?.url ? body.url : url;
  let isDisabled: boolean = body?.initTranscription == true ? true : false;
  let label: string =
    body?.initTranscription == false ? "Re-Transcribe" : "Transcribe";
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
  /**
   * To Transcribe the audio, shows necessary feedback on transcription start, end and also on error.
   * Auto Refreshes the page the dispplay the content once transcription is completed
   *
   * TODO - move to store, lambda url - env
   */
  async function onTranscribe() {
    isDisabled = true;
    let body = {
      s3Url: url,
      userId: userId,
      nodeId: nodeId
    };
    let jsonBody = JSON.stringify(body);
    const response = await fetch(
      "https://ykc7vk56p3munwz27rieasmxbm0rgajq.lambda-url.us-east-1.on.aws/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: jsonBody
      }
    );

    if (!response.ok) {
      isError = true;
      setTimeout(() => (isError = false), 3000);
      isDisabled = false;
      const db = new SurrealDatabase(import.meta.env?.VITE_SURREAL_URL);
      await db.merge(nodeId, {
        body: { initTranscription: false },
        contentType: "AUDIO"
      });
      const message = `An error has occurred: ${response.status}`;
      throw new Error(message);
    }
    isDisabled = false;
    const result = (await response.json()).result;
    if (isReplaceable) {
      $captureStore.fileDetails.transcription = result;
      $captureStore.fileDetails.initTranscription = false;
      label = "Re-Transcribe";
    } else dispatch("refresh");
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
    label = body?.initTranscription == false ? "Re-Transcribe" : "Transcribe";
  });
  onDestroy(() => {
    if (wavesurferPreview) {
      wavesurferPreview.destroy();
    }
  });
</script>

<div class="relative my-4 text-justify border border-bgs4">
  <div
    id="audioCapturePreview"
    class="relative {body?.transcription !== undefined ||
    $captureStore?.fileDetails?.transcription !== undefined
      ? 'bg-bgs2'
      : ''}"
  >
    <div class="absolute z-10 top-7/10 left-1 text-sm text-fgs2 opacity-90">
      {formatSeconds(previewCountDown, TimeFormat.CLOCK)}
    </div>
    <div class="absolute z-10 top-7/10 right-1 text-sm text-fgs2 opacity-90">
      {formatSeconds(previewTotalDuration, TimeFormat.CLOCK)}
    </div>
  </div>
  <p class="p-2 text-center text-rose-700" class:hidden={!isError}>
    Transcription Error.
  </p>
  {#if body?.initTranscription == true || isDisabled}
    <p class="p-2">Transcribing...</p>
  {:else if body?.transcription !== undefined}
    <p class="p-2">{body.transcription}</p>
  {:else if $captureStore?.fileDetails?.transcription !== undefined}
    <p class="p-2">{$captureStore.fileDetails.transcription}</p>
  {/if}
</div>
<div class="flex w-full justify-center gap-3">
  {#if recordingState === PlayActionState.STOPPED}
    <Button
      on:click={() => {
        recordingState = PlayActionState.PREVIEWING;
        wavesurferPreview.play();
      }}
      type={ButtonVariant.PRIMARY}
      icon="play"
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
        icon="pause"
        label="Pause"
      />
    {:else}
      <Button
        on:click={() => {
          wavesurferPreview.play();
          previewingState = PlayActionState.RESUMEPREVIEWING;
        }}
        type={ButtonVariant.PRIMARY}
        icon="play"
        label="Resume"
      />
    {/if}
  {/if}
  {#if isReplaceable}
    <Button
      on:click={() => dispatch("startRecording")}
      icon="arrow-path"
      label="Replace"
    />
  {/if}
  <Button on:click={onTranscribe} {isDisabled} icon="document-text" {label} />
</div>
