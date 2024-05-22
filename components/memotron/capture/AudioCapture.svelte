<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { ButtonVariant } from "$lib/tidy/types/button.type";
  import { PlayActionState } from "$lib/tidy/types/event.enum";
  import { TimeFormat } from "$lib/tidy/types/time.type";
  import { formatSeconds } from "$lib/tidy/utils/time.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import { Persistance } from "$lib/tidy/stores/persistance";
  import { generateUID } from "$lib/tidy/utils/utils";
  import type { FileDetails } from "$lib/tidy/types/memotron/capture.type";
  import WaveSurfer from "wavesurfer.js";
  import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";
  import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
  import { retrieveCurrentColors } from "$lib/tidy/utils/theme.utils";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import appearance from "$lib/tidy/stores/appearance.store";
  const dispatch = createEventDispatcher();
  let fileDetails: FileDetails;
  let recordingDuration: number = 0;
  let previewCountDown: number = 0;
  let previewTotalDuration: number = 0;
  let blobRefernce: any = undefined;
  let url: string;
  let recordingState: PlayActionState = PlayActionState.NOT_STARTED;
  let previewingState:
    | PlayActionState.PAUSEPREVIEWING
    | PlayActionState.RESUMEPREVIEWING = PlayActionState.RESUMEPREVIEWING;
  let wavesurfer: WaveSurfer;
  let wavesurfer2: WaveSurfer;
  let record: RecordPlugin;
  const id = generateUID();
  const currentColors: any = retrieveCurrentColors($appearance);
  /**
   * @description Start recording audio, if already recording or previewing, it will reset the recording states and wavesurfer instances
   */
  function startRecording() {
    if (
      record.isRecording() ||
      recordingState === PlayActionState.PREVIEWING ||
      recordingState === PlayActionState.STOPPED
    ) {
      onChange(true);
      record.unAll();
      record.destroy();
      if (wavesurfer2) wavesurfer2.destroy();
      URL.revokeObjectURL(url);
      createWaveSurferForLiveVisualizer();
      previewCountDown = 0;
      blobRefernce = null;
    }

    record.startRecording().then(() => {
      recordingState = PlayActionState.RUNNING;
    });
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
      recordingState = PlayActionState.STOPPED;
      record.stopRecording();
    }
  }
  /**
   * @description Creates wavesurfer instance for preview and uses timeline plugin to add timeline to the interactive visualization.
   */
  function createWaveSurferForPreview() {
    if (wavesurfer2) {
      wavesurfer2.destroy();
    }

    wavesurfer2 = WaveSurfer.create({
      container: "#audioCapturePreview",
      waveColor: currentColors["aps2"],
      progressColor: currentColors["aps1"],
      barWidth: 2,
      barGap: 2,
      dragToSeek: true,
      plugins: [TimelinePlugin.create()],
      url: url
    });

    wavesurfer2.on("decode", (duration) => {
      previewTotalDuration = duration;
    });
    wavesurfer2.on("finish", () => {
      recordingState = PlayActionState.STOPPED;
      previewingState = PlayActionState.RESUMEPREVIEWING;
      wavesurfer2.setTime(0); //to reset preview
    });
    wavesurfer2.on("timeupdate", (currentTime) => {
      previewCountDown = currentTime;
    });
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
      barWidth: 2,
      barGap: 2
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
      onChange();
      url = URL.createObjectURL(blob);
      createWaveSurferForPreview();
    });
  }

  onMount(() => {
    createWaveSurferForLiveVisualizer();
  });

  function onChange(isReset: boolean = false) {
    if (isReset) {
      dispatch("change", null);
      return;
    }
    fileDetails = {
      name: `${id}.webm`,
      data: blobRefernce,
      type: "audio/webm",
      duration: recordingDuration
    };
    dispatch("change", fileDetails);
  }

  async function uploadTest() {
    const contentType = "audio/webm";
    const result = await new Persistance().uploadFile(
      contentType,
      `${id}.webm`,
      blobRefernce
    );
    console.log({ result });
  }
</script>

<div class="flex flex-col w-8/12 gap-2">
  <div
    class:hidden={recordingState === PlayActionState.STOPPED ||
      recordingState === PlayActionState.PREVIEWING}
  >
    <div
      id="audioCaptureLiveVisualizer"
      class="w-6/12 mt-4"
      style={recordingState !== PlayActionState.RUNNING &&
      recordingState !== PlayActionState.PAUSED
        ? ""
        : "border-right:2px solid " + currentColors["aps1"]}
    ></div>
    <p class="text-h1 font-bold text-fgs2">
      {formatSeconds(recordingDuration, TimeFormat.CLOCK)}
    </p>
  </div>
  <div
    class:hidden={recordingState !== PlayActionState.STOPPED &&
      recordingState !== PlayActionState.PREVIEWING}
    class="relative my-4"
  >
    <div id="audioCapturePreview" class="relative"></div>
    <div
      class="absolute z-10 top-1/2 left-0 -mt-5 bg-bgs2 text-sm text-fgs2 opacity-90"
    >
      {formatSeconds(previewCountDown, TimeFormat.CLOCK)}
    </div>
    <div
      class="absolute z-10 top-1/2 right-0 -mt-5 bg-bgs2 text-sm text-fgs2 opacity-90"
    >
      {formatSeconds(previewTotalDuration, TimeFormat.CLOCK)}
    </div>
  </div>
  <div class="flex w-full justify-center gap-3">
    {#if recordingState === PlayActionState.NOT_STARTED}
      <Button
        on:click={startRecording}
        icon="microphone"
        type={ButtonVariant.PRIMARY}
        label="Start recording"
      />
    {:else if recordingState === PlayActionState.RUNNING}
      <Button
        on:click={startRecording}
        icon="arrow-path"
        type={ButtonVariant.DANGER}
        label="Restart"
      />
      <Button on:click={toggleRecording} icon="pause" label="Pause" />
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
    {:else if recordingState === PlayActionState.STOPPED}
      <Button
        on:click={() => {
          recordingState = PlayActionState.PREVIEWING;
          wavesurfer2.play();
        }}
        type={ButtonVariant.PRIMARY}
        icon="play"
        label="Preview"
      />
      <Button on:click={startRecording} icon="arrow-path" label="Replace" />
    {:else if recordingState === PlayActionState.PREVIEWING}
      {#if previewingState === PlayActionState.RESUMEPREVIEWING}
        <Button
          on:click={() => {
            wavesurfer2.pause();
            previewingState = PlayActionState.PAUSEPREVIEWING;
          }}
          type={ButtonVariant.PRIMARY}
          icon="pause"
          label="Pause"
        />
      {:else}
        <Button
          on:click={() => {
            wavesurfer2.play();
            previewingState = PlayActionState.RESUMEPREVIEWING;
          }}
          type={ButtonVariant.PRIMARY}
          icon="play"
          label="Resume"
        />
      {/if}
      <Button on:click={startRecording} icon="arrow-path" label="Replace" />
    {/if}
  </div>
</div>
<!-- <Button on:click={uploadTest} label="upload test" /> -->
