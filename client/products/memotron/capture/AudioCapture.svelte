<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { PlayActionState } from "$lib/client/types/event.enum";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import { Persistence } from "$lib/client/persistence/persistence";
  import { generateUID } from "$lib/client/utils/utils";
  import type { FileDetails } from "$lib/client/types/memotron/capture.type";
  import WaveSurfer from "wavesurfer.js";
  import RecordPlugin from "wavesurfer.js/dist/plugins/record";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import appearance from "$lib/client/stores/appearance.store";
  import account from "$lib/client/stores/account.store";
  import AudioScrubablePreview from "./AudioScrubablePreview.svelte";
  import { captureStore } from "./capture.store";
  const dispatch = createEventDispatcher();
  let recordingState: PlayActionState = PlayActionState.NOT_STARTED;
  let url: string;
  let fileDetails: FileDetails;
  let recordingDuration: number = 0;
  let blobRefernce: any = undefined;
  let wavesurfer: WaveSurfer;
  let record: RecordPlugin;
  let isDisabled = false;
  const id = generateUID();
  const currentColors: any = retrieveCurrentColors($appearance);
  /**
   * @description Start recording audio, if already recording or previewing, it will reset the recording states and wavesurfer instances
   */

  //TODO - Add a recording limit of 1hr 15min
  function startRecording() {
    if (
      record.isRecording() ||
      recordingState === PlayActionState.PREVIEWING ||
      recordingState === PlayActionState.STOPPED
    ) {
      onChange(true);
      record.unAll();
      record.destroy();
      url = "";
      createWaveSurferForLiveVisualizer();
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
      record.stopRecording();
    }
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
    });
  }

  onMount(() => {
    createWaveSurferForLiveVisualizer();
    if ($captureStore?.fileDetails) {
      fileDetails = $captureStore?.fileDetails;
      url = fileDetails.url;
      recordingState = PlayActionState.STOPPED;
    }
  });

  async function onChange(isReset: boolean = false) {
    if (isReset) {
      dispatch("change", null);
      return;
    }
    isDisabled = true;
    await tempUpload();
    fileDetails = {
      name: `${id}.webm`,
      data: blobRefernce,
      url: url,
      type: "audio/webm",
      duration: recordingDuration
    };
    dispatch("change", fileDetails);
    recordingState = PlayActionState.STOPPED;
    isDisabled = false;
  }

  async function tempUpload() {
    const contentType = "audio/webm";
    const result = await account.uploadFile(
      contentType,
      `${id}.webm`,
      blobRefernce,
      true
    );
    url = result.uploadURL.split("?")[0];
  }
</script>

<div class="flex flex-col w-11/12 gap-2">
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
    <p class="text-h1 font-bold text-fgs2 text-center">
      {formatSeconds(recordingDuration, TimeFormat.CLOCK)}
    </p>
  </div>
  {#if recordingState == PlayActionState.STOPPED || recordingState == PlayActionState.PREVIEWING}
    <AudioScrubablePreview
      {url}
      isReplaceable={true}
      on:startRecording={startRecording}
    />
  {:else}
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
          {isDisabled}
        />
        <Button
          on:click={toggleRecording}
          icon="pause"
          label="Pause"
          {isDisabled}
        />
        <Button
          on:click={stopRecording}
          type={ButtonVariant.PRIMARY}
          icon="stop"
          label="Finish"
          {isDisabled}
        />
      {:else if recordingState === PlayActionState.PAUSED}
        <Button
          on:click={toggleRecording}
          icon="play"
          label="Resume"
          {isDisabled}
        />
        <Button
          on:click={stopRecording}
          type={ButtonVariant.PRIMARY}
          icon="stop"
          label="Finish"
          isLoading={isDisabled}
        />
      {/if}
    </div>
  {/if}
</div>
<!-- <Button on:click={tempUpload} label="upload test" /> -->
