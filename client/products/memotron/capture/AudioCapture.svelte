<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { PlayActionState } from "$lib/client/types/event.enum";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import WaveSurfer from "wavesurfer.js";
  import RecordPlugin from "wavesurfer.js/dist/plugins/record";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import appearance from "$lib/client/stores/appearance.store";
  import view from "$lib/client/stores/view.store";
  import PlayerControl from "$lib/client/elements/player/controls/PlayerControl.svelte";
  import { createEventDispatcher, onDestroy } from "svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import type { IActiveCaptureStore } from "./capture.store";
  import InlineErrorMessage from "$lib/client/elements/text/InlineErrorMessage.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  const dispatch = createEventDispatcher();
  export let captureStore: IActiveCaptureStore;
  export let isSaveInProgress: boolean = false;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.CAPTURE;
  export let creationContext: IRecordId | undefined = undefined;

  let recordingState: PlayActionState = PlayActionState.NOT_STARTED;
  let url: string;
  let recordingDuration: number = 0;
  let blobRefernce: any = undefined;
  let wavesurfer: WaveSurfer;
  let record: RecordPlugin;
  let isShowPreview = false;
  let error: string | undefined = undefined;
  const currentColors: any = retrieveCurrentColors($appearance);
  /**
   * @description Start recording audio, if already recording or previewing, it will reset the recording states and wavesurfer instances
   */

  onDestroy(() => {
    cleanup();
  });

  //TODO - Add a recording limit of 1hr 15min
  function startRecording() {
    isShowPreview = true;
    if (record?.isRecording()) {
      record.unAll();
      record.destroy();
      url = "";
      blobRefernce = null;
    }
    setTimeout(() => {
      createWaveSurferForLiveVisualizer();
      record.startRecording().then(() => {
        recordingState = PlayActionState.RUNNING;
      });
    }, 10);
  }
  /**
   * @description Pause or resume recording audio
   */
  function toggleRecording() {
    if (record.isPaused()) {
      record.resumeRecording();
      recordingState = PlayActionState.RUNNING;
      return;
    }
    recordingState = PlayActionState.PAUSED;
    record.pauseRecording();
  }
  /**
   * @description Stop recording audio
   */
  function stopRecording() {
    if (record.isRecording() || record.isPaused()) {
      record.stopRecording();
    }
  }

  function cleanup() {
    if (record) {
      if (record.isRecording() || record.isPaused()) {
        record.stopRecording();
      }
      record.unAll();
      record.destroy();
    }
    if (wavesurfer) {
      wavesurfer.destroy();
    }
    recordingState = PlayActionState.NOT_STARTED;
    url = "";
    blobRefernce = null;
    isShowPreview = false;
  }

  /**
   * @description Creates wavesurfer instance for live visualizer and encapsulates wavesurfer inside the record plugin
   * record is a plugin for wavesurfer to record audio and to visualize in real time
   * record has subscribed events like record-end, record-progress
   */
  function createWaveSurferForLiveVisualizer() {
    if (wavesurfer) {
      wavesurfer.destroy();
    }

    wavesurfer = WaveSurfer.create({
      container: "#audioCaptureLiveVisualizer",
      waveColor: currentColors["aps1"],
      progressColor: currentColors["aps1"],
      cursorColor: currentColors["aps1"],
      barWidth: 1,
      barGap: 2,
      height: "auto"
    });

    record = wavesurfer.registerPlugin(
      RecordPlugin.create({
        scrollingWaveform: true,
        renderRecordedAudio: false,
        scrollingWaveformWindow: 5
      })
    );

    record.on("record-progress", (time: number) => {
      recordingDuration = time / 1000; //time recieved in milliseconds
    });

    record.on("record-end", (blob: Blob) => {
      blobRefernce = blob;
      onFinish();
    });
  }

  async function onFinish() {
    const waveformBlob = await resolveWaveFormBlob();
    isSaveInProgress = true;
    const result = await captureStore.saveAudioRecording(
      blobRefernce,
      recordingDuration,
      {
        isEmbedContext: accessPoint === ResourceAccessPoint.MARKDOWN_EMBED,
        creationContext,
        thumbnailBlob: waveformBlob
      }
    );
    isSaveInProgress = false;
    dispatch("save", result);
  }

  async function resolveWaveFormBlob() {
    try {
      const blob = await wavesurfer.exportImage("image/jpeg", 0.5, "blob");
      return blob[1];
    } catch (error) {
      console.error("Failed to generate waveform:", error);
      return undefined;
    }
  }
</script>

<div class="flex flex-col h-full justify-center w-11/12 gap-8">
  <div class="flex min-h-64">
    {#if isShowPreview}
      <div
        class:hidden={recordingState === PlayActionState.STOPPED ||
          recordingState === PlayActionState.PREVIEWING}
        class="flex flex-col items-center justify-center gap-4 w-full flex-1"
      >
        <div class="flex w-full h-7/10 max-h-96">
          <div
            id="audioCaptureLiveVisualizer"
            class="w-6/12 mt-4"
            style={recordingState !== PlayActionState.RUNNING &&
            recordingState !== PlayActionState.PAUSED
              ? ""
              : "border-right:2px solid " + currentColors["aps1"]}
          />
        </div>
        <p class="text-h1 font-bold text-fgs2 text-center">
          {formatSeconds(recordingDuration, TimeFormat.CLOCK)}
        </p>
      </div>
    {/if}
  </div>
  {#if $view.isConstrainedWidth || recordingState === PlayActionState.NOT_STARTED}
    <div
      class={cn("flex w-full justify-center gap-6", {
        "flex-col": recordingState === PlayActionState.NOT_STARTED
      })}
    >
      {#if recordingState === PlayActionState.NOT_STARTED}
        <PlayerControl
          on:click={startRecording}
          icon="ph:microphone-light"
          type={ButtonVariant.PRIMARY}
          label="Start"
          size={Size.lg}
        />
      {:else if recordingState === PlayActionState.RUNNING}
        <!-- <PlayerControl
          on:click={startRecording}
          icon="ph:arrow-clockwise-light"
          type={ButtonVariant.DANGER}
          label="Restart"
        /> -->
        <PlayerControl
          on:click={toggleRecording}
          icon="ph:pause-light"
          label="Pause"
        />
        <PlayerControl
          on:click={stopRecording}
          type={ButtonVariant.PRIMARY}
          icon="ph:stop-light"
          label="Finish"
        />
      {:else if recordingState === PlayActionState.PAUSED}
        <PlayerControl
          on:click={toggleRecording}
          icon="ph:play-light"
          label="Resume"
        />
        <PlayerControl
          on:click={stopRecording}
          type={ButtonVariant.PRIMARY}
          icon="ph:stop-light"
          label="Finish"
        />
      {/if}
      <PlayerControl
        on:click={() => {
          cleanup();
          dispatch("cancel");
        }}
        icon="ph:x-light"
        size={recordingState === PlayActionState.NOT_STARTED
          ? Size.sm
          : Size.md}
        type={ButtonVariant.DANGER}
        style={recordingState === PlayActionState.NOT_STARTED
          ? ButtonStyle.OUTLINED
          : ButtonStyle.DEFAULT}
        label={recordingState === PlayActionState.NOT_STARTED
          ? undefined
          : "Cancel"}
      />
    </div>
  {:else}
    <div class="flex w-full justify-center gap-6">
      {#if recordingState === PlayActionState.RUNNING}
        <!-- <Button
          on:click={startRecording}
          icon="ph:arrow-clockwise-light"
          type={ButtonVariant.DANGER}
          label="Restart"
        /> -->
        <Button
          on:click={toggleRecording}
          icon="ph:pause-light"
          label="Pause"
        />
        <Button
          on:click={stopRecording}
          type={ButtonVariant.PRIMARY}
          icon="ph:stop-light"
          label="Finish"
        />
      {:else if recordingState === PlayActionState.PAUSED}
        <Button
          on:click={toggleRecording}
          icon="ph:play-light"
          label="Resume"
        />
        <Button
          on:click={stopRecording}
          type={ButtonVariant.PRIMARY}
          icon="ph:stop-light"
          label="Finish"
        />
      {/if}
      <Button
        on:click={() => {
          cleanup();
          dispatch("cancel");
        }}
        icon="ph:x-light"
        type={ButtonVariant.DANGER}
        label="Cancel"
      />
    </div>
  {/if}
  {#if error}
    <InlineErrorMessage bind:error />
  {/if}
</div>
