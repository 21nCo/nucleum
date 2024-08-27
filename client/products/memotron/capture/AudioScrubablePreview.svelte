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
  import account from "$lib/client/stores/account.store";
  import { Audio2MD } from "./AudioToMarkdown.utils";
  import NodularMarkdown from "$lib/client/components/markdown/NodularMarkdown.svelte";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import type { DropdownItem } from "$lib/client/types/dropdownItem.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import TextArea from "$lib/client/elements/input/TextArea.svelte";
  import { generateUID } from "$lib/client/utils/utils";
  import { userPreferences } from "$lib/client/stores/app.store";

  export let body: any = {};
  export let url: string = "";
  export let isReplaceable: boolean = false;
  export let nodeId: string = "dummy";
  url = body?.url ? body.url : url;
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
  let modelOptions: string[] = [
    "tiny",
    "tiny.en",
    "base",
    "base.en",
    "small",
    "small.en"
  ];
  let accuracy: DropdownItem[] = [
    {
      value: "tiny.en",
      label: "Moderate"
    },
    {
      value: "base.en",
      label: "Optimal"
    },
    {
      value: "small.en",
      label: "High"
    }
  ];

  let speed: DropdownItem[] = [
    {
      value: "tiny.en",
      label: "Fast"
    },
    {
      value: "base.en",
      label: "Optimal"
    },
    {
      value: "small.en",
      label: "Moderate"
    }
  ];

  let model: string = $userPreferences.lastUsedTranscriptionModel;

  /**
   * To Transcribe the audio, shows necessary feedback on transcription start, end and also on error.
   * Auto Refreshes the page the dispplay the content once transcription is completed
   * TODO - move to store, lambda url - env
   */

  async function onTranscribe(): Promise<string> {
    if (
      $captureStore?.fileDetails?.transcription &&
      $userPreferences.lastUsedTranscriptionModel === model
    ) {
      $captureStore.fileDetails.mdBlocks = [];
      return "restranscribing using the Same model will provide the same output";
    }
    isDisabled = true;
    const region = $account.userInfo?.region;
    let body = {
      s3Url: url,
      userId: userId,
      nodeId: nodeId,
      region: region,
      model: model
    };
    let jsonBody = JSON.stringify(body);
    let result: string | null = null;
    try {
      const response = await fetch(import.meta.env.VITE_AUDIOTRANS_F_URL, {
        method: "POST",
        body: jsonBody,
        headers: {
          "Content-Type": "application/json"
        }
      });
      isDisabled = false;
      result = (await response.json()).result;
      if (isReplaceable || $captureStore?.fileDetails?.data) {
        $captureStore.fileDetails.transcription = result;
        $captureStore.fileDetails.initTranscription = false;
        label = "Re-Transcribe";
      } else dispatch("refresh");
    } catch (error) {
      console.error("Network or JSON parsing error:", error);
      isError = true;
      setTimeout(() => (isError = false), 3000);
      isDisabled = false;
      const db = new SurrealDatabase();
      await db.merge(nodeId, {
        body: { initTranscription: false },
        contentType: "AUDIO"
      });
    } finally {
      isDisabled = false;
      $captureStore.fileDetails.mdBlocks = [];
      $userPreferences.lastUsedTranscriptionModel = model;
      if (isConvertToMarkdown && result) {
        return result;
      } else return " transcription successful";
    }
  }

  /**
   * Converts the audio to markdown. IF trnscript already exists, it uses that instead of re-transcribing. It retranscibes in situations where the model Accuracy has been swithced
   */
  async function convertToMarkdown() {
    isConvertToMarkdown = true;
    let transcript: string;
    if (
      $captureStore?.fileDetails?.transcription &&
      $userPreferences.lastUsedTranscriptionModel === model
    )
      transcript = $captureStore.fileDetails.transcription;
    else if (
      body?.transcription &&
      $userPreferences.lastUsedTranscriptionModel === model
    )
      transcript = body.transcription;
    else transcript = await onTranscribe();
    //last few test cases:
    // transcript =
    //   "Heading five, just checking how well it can handle edge cases, like stop. divider Edge cases in the sense whenever that is a sub child or sub sub child creator, only if that is a parent for it, like that parent for it. If it is a sub child, it means a child as parent, if it is a child, it means an ordered list or not a list as the parent respectively. So if in case the user forgets who mistakenly adds something, say something by mistake, which doesn't have a parent, in that case, how well is going to handle the test. Starting with double divider ordered list, this is my first pointer. quote If this doesn't work, take the next one, OL, this as my first pointer. And then I'm going to go directly to the sub child instead of having the child. OL sub child, this is going to be my sub child, but hopefully this taken as a child, since that wasn't a parent's side to this. And yeah, let's test";
    //"Heading five, just checking how well it can handle edge cases, like stop. Edge cases in the sense whenever that is a sub child or sub sub child creator, only if that is a parent for it, like that parent for it. If it is a sub child, it means a child as parent, if it is a child, it means an ordered list or not a list as the parent respectively. So if in case the user forgets who mistakenly adds something, say something by mistake, which doesn't have a parent, in that case, how well is going to handle the test. Starting with ordered list, this is my first pointer. If this doesn't work, take the next one, OL, this as my first pointer. And then I'm going to go directly to the sub child instead of having the child. OL sub child, this is going to be my sub child, but hopefully this taken as a child, since that wasn't a parent's side to this. And yeah, let's test";
    // H1, just checking how well it can handle edge cases, like stop. Edge cases in the sense whenever that is a sub child or sub sub child creator, only if that is a parent for it, like that parent for it. If it is a sub child, it means a child as parent, if it is a child, it means an ordered list or not a list as the parent respectively. So if in case the user forgets who mistakenly adds something, say something by mistake, which doesn't have a parent, in that case, how well is going to handle the test. Starting with ordered list, this is my first pointer. If this doesn't work, take the next one, OL, this as my first pointer. And then I'm going to go directly to the sub child instead of having the child. OL sub child, this is going to be my sub child, but hopefully this taken as a child, since that wasn't a parent's side to this. And yeah, let's test
    // "H1, this is going to be the super cool form of italic writing a markdown italic. ul, there's going to be my bold first bold stop point in the first. One was the inductor, this will be the second point. ul, so this will be my another point. ul child, this is going to be my subchild of my previous point. ul sub-child this is example for Sc ul sub child 2nd exmaple for sc ul sub sub child example for ssc ul child, this is going to be my second subchild of my previous point. And let's check.";
    // "H1, this is going to be the super cool form of writing a markdown. ul, there's going to be my first point in the first. One was the inductor, this will be the second point. ul, so this will be my another point. ul child, this is going to be my subchild of my previous point. ul child, this is going to be my second subchild of my previous point. And let's check.";
    isConvertToMarkdown = false;
    if (typeof transcript !== "string") return "transcript is not a string";
    $userPreferences.lastUsedTranscriptionModel = model;
    $captureStore.fileDetails.mdBlocks =
      Audio2MD.convertAudioToMarkdown(transcript);
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
    label = body?.initTranscription == false ? "Re-Transcribe" : "Text";
  });
  onDestroy(() => {
    if (wavesurferPreview) {
      wavesurferPreview.destroy();
    }
  });
</script>

<div class="relative top-16 flex flex-col justify-center w-full h-full">
  <div class="flex flex-col w-full items-center gap-3">
    <p class="w-full text-h1">Transcription</p>
    <div class="flex w-full gap-3">
      <DropDown
        items={accuracy}
        isDisableSearch={true}
        label={{
          label: "Accuracy",
          orientation: Orientation.Vertical,
          isShrink: true
        }}
        value={model}
        on:select={(e) => (model = e.detail)}
      />
      <DropDown
        items={speed}
        isDisableSearch={true}
        label={{
          label: "Speed",
          orientation: Orientation.Vertical,
          isShrink: true
        }}
        value={model}
        on:select={(e) => (model = e.detail)}
      />
    </div>
    <div class="flex w-full gap-3">
      <Button
        on:click={onTranscribe}
        {isDisabled}
        icon="document-text"
        {label}
      />
      <Button
        on:click={convertToMarkdown}
        {isDisabled}
        icon="arrow-path"
        label="Markdown"
      />
    </div>
  </div>
  <div class="relative w-full my-4 text-justify border border-bgs4">
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
    {:else if body?.mdBlocks !== undefined}
      <NodularMarkdown
        mdId={generateUID()}
        isNodular={true}
        md={{ blocks: body?.mdBlocks }}
      />
    {:else if $captureStore?.fileDetails?.mdBlocks && $captureStore?.fileDetails?.mdBlocks?.length > 0}
      <NodularMarkdown
        mdId={generateUID()}
        isNodular={true}
        md={{ blocks: $captureStore?.fileDetails?.mdBlocks }}
      />
    {:else if body?.transcription !== undefined}
      <TextArea bind:value={body.transcription} />
      <!-- <p class="p-2">{body.transcription}</p> -->
    {:else if $captureStore?.fileDetails?.transcription !== undefined}
      <TextArea bind:value={$captureStore.fileDetails.transcription} />
      <!-- <p class="p-2">{$captureStore.fileDetails.transcription}</p> -->
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
  </div>
</div>
