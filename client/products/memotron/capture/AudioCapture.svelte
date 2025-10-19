<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { PlayActionState } from "@21n/types/event.enum";
  import { TimeFormat } from "@21n/types/time.type";
  import { formatSeconds } from "@21n/utils/time.utils";
  import WaveSurfer from "wavesurfer.js";
  import RecordPlugin from "wavesurfer.js/dist/plugins/record";
  import { retrieveCurrentColors } from "@21n/utils/theme.utils";
  import appearance from "@21n/stores/appearance.store";
  import view from "@21n/stores/view.store";
  import PlayerControl from "@21n/elements/player/controls/PlayerControl.svelte";
  import { createEventDispatcher, onDestroy } from "svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import type { IRecordId } from "@21n/types/data.type";
  import type { IActiveCaptureStore } from "@21n/products/memotron/capture/capture.store";
  import InlineErrorMessage from "@21n/elements/text/InlineErrorMessage.svelte";
  import { Size } from "@21n/types/size.enum";
  import { confirmationNotification } from "@21n/stores/notification.store";
  import { cn } from "@21n/utils/ui.utils";
  const dispatch = createEventDispatcher();
  export let captureStore: IActiveCaptureStore;
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
    const result = await captureStore.saveAudioRecording(
      blobRefernce,
      recordingDuration,
      {
        isEmbedContext: accessPoint === ResourceAccessPoint.MARKDOWN_EMBED,
        creationContext,
        thumbnailBlob: waveformBlob
      }
    );
    dispatch("saved", result);
  }

  async function resolveWaveFormBlob() {
    try {
      const blob = await wavesurfer.exportImage("image/jpeg", 0.5, "blob");
      return blob[1] ?? blob[0];
    } catch (error) {
      console.error("Failed to generate waveform:", error);
      return undefined;
    }
  }

  function onGoBack() {
    if (recordingState !== PlayActionState.NOT_STARTED) {
      confirmationNotification.notify({
        title: "Are you sure you want to go back?",
        message: "You will lose your recording.",
        confirmAction: {
          label: "Go back",
          callback: async () => {
            proceedToGoBack();
          }
        }
      });
    } else {
      proceedToGoBack();
    }
  }

  function proceedToGoBack() {
    cleanup();
    dispatch("clear");
  }
</script>

<div class="grid grid-rows-2 h-full w-full">
  <div class="flex w-full">
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
        <p class="text-h1 font-medium text-fgs2 text-center">
          {formatSeconds(recordingDuration, TimeFormat.CLOCK)}
        </p>
      </div>
    {/if}
  </div>
  {#if $view.isConstrainedWidth || recordingState === PlayActionState.NOT_STARTED}
    <div class="flex flex-col w-full justify-center">
      <div
        class={cn("flex w-full justify-center gap-6 mb-auto", {
          "flex-col-reverse": recordingState === PlayActionState.NOT_STARTED
        })}
      >
        <PlayerControl
          on:click={onGoBack}
          icon="back"
          label={recordingState === PlayActionState.NOT_STARTED
            ? undefined
            : "Go back"}
          tooltip={recordingState === PlayActionState.NOT_STARTED
            ? "Go back"
            : undefined}
          style={ButtonStyle.OUTLINED}
        />
        {#if recordingState === PlayActionState.NOT_STARTED}
          <PlayerControl
            on:click={startRecording}
            icon="microphone"
            type={ButtonVariant.PRIMARY}
            label="Start"
            size={Size.lg}
          />
        {:else if recordingState === PlayActionState.RUNNING}
          <PlayerControl
            on:click={toggleRecording}
            style={ButtonStyle.OUTLINED}
            icon="pause"
            label="Pause"
          />
          <PlayerControl
            on:click={stopRecording}
            type={ButtonVariant.PRIMARY}
            icon="stop"
            label="Finish"
          />
        {:else if recordingState === PlayActionState.PAUSED}
          <PlayerControl
            on:click={toggleRecording}
            icon="play"
            label="Resume"
          />
          <PlayerControl
            on:click={stopRecording}
            type={ButtonVariant.PRIMARY}
            icon="stop"
            label="Finish"
          />
        {/if}
      </div>
    </div>
  {:else}
    <div class="flex w-full justify-center gap-6">
      <Button
        on:click={onGoBack}
        icon="back"
        style={ButtonStyle.OUTLINED}
        label="Go back"
      />
      {#if recordingState === PlayActionState.RUNNING}
        <Button
          on:click={toggleRecording}
          icon="pause"
          style={ButtonStyle.OUTLINED}
          label="Pause"
        />
        <Button
          on:click={stopRecording}
          type={ButtonVariant.PRIMARY}
          icon="stop"
          label="Finish"
        />
      {:else if recordingState === PlayActionState.PAUSED}
        <Button on:click={toggleRecording} icon="play" label="Resume" />
        <Button
          on:click={stopRecording}
          type={ButtonVariant.PRIMARY}
          icon="stop"
          label="Finish"
        />
      {/if}
    </div>
  {/if}
  {#if error}
    <InlineErrorMessage bind:error />
  {/if}
</div>
