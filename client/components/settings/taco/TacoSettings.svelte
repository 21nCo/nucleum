<script lang="ts">
  import ProgressBar from "$lib/client/elements/ProgressBar.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { tacoWorker } from "$lib/client/products/memotron/memotron.utils";
  import { Action } from "$lib/client/types/action.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { TacoActions } from "$lib/client/types/taco.types";
  import modalEvent from "../../modal/modal.store";
  import { userPreferences } from "../userPreferences.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import { InfoTextType } from "$lib/client/types/text.type";

  export let isCmdBarLaunch: boolean = false;

  const mainLabel = `We will download AI models to your device so that you can use AI for free and offline. No privacy compromise. No data leaving your device.`;
  let progress = 0;
  let label: string;
  let isDisabled: boolean = false;

  async function deleteItemsFromCache(
    modelMatch: string,
    cacheName: string = "transformers-cache"
  ) {
    let transformersCache = await caches.open(cacheName);
    let all = await transformersCache.keys();
    let filteredUrls = all
      .filter((key) => key.url.includes(modelMatch))
      .map((key) => key.url);
    if (!transformersCache) return;
    for (let url of filteredUrls) {
      await transformersCache.delete(url);
    }
  }

  function progressUpdate(e: any) {
    if (e.data.progress) progress = e.data.progress;
    if (e.data.file) label = e.data.file;
    if (e.data.status == "ready") {
      isDisabled = false;
    }
  }
  async function onSemanticSearchToggle(e: any) {
    if (e.detail) {
      isDisabled = true;
      tacoWorker.postMessage({
        action: TacoActions.INITIAlIZE_FEATURE_EXTRACTOR
      });
      tacoWorker.onmessage = (e) => {
        progressUpdate(e);
      };
    } else {
      await deleteItemsFromCache("onnx-msmarco");
      tacoWorker.postMessage({
        action: TacoActions.RESET_FEATURE_EXTRACTOR
      });
    }
  }

  async function onAudioTranscriptionToggle(e: any) {
    if (e.detail) {
      isDisabled = true;
      tacoWorker.postMessage({
        action: TacoActions.INITIALIZE_TRANSCRIBER
      });
      tacoWorker.onmessage = (e) => {
        progressUpdate(e);
      };
    } else {
      await deleteItemsFromCache("whisper");
      tacoWorker.postMessage({
        action: TacoActions.RESET_TRANSCRIBER
      });
    }
  }

  async function onQuestionAnsweringToggle(e: any) {
    if (e.detail) {
      isDisabled = true;
      tacoWorker.postMessage({
        action: TacoActions.INITIALIZE_QUESTION_ANSWERER
      });
      tacoWorker.onmessage = (e) => {
        progressUpdate(e);
      };
    } else {
      await deleteItemsFromCache("onnx-roberta-");
      tacoWorker.postMessage({
        action: TacoActions.RESET_QUESTION_ANSWERER
      });
    }
  }
</script>

<div class="flex flex-col justify-between h-full gap-8">
  <div class="flex flex-col gap-4">
    <div class="text-fgs2 text-b2 min-w-fit text-left">
      {mainLabel}
    </div>

    <SwitchInput
      size={Size.sm}
      {isDisabled}
      bind:checked={$userPreferences.localAI.semanticSearch}
      on:change={onSemanticSearchToggle}
      isExpanded={true}
      label={{
        label: "Semantic Search - 250MB",
        tooltip: {
          body: "Enable this to search for semantically relevant content in the search bar."
        }
      }}
    />
    <SwitchInput
      size={Size.sm}
      {isDisabled}
      bind:checked={$userPreferences.localAI.audioTranscription}
      on:change={onAudioTranscriptionToggle}
      isExpanded={true}
      label={{
        label: "Audio Transcription - 380MB",
        tooltip: {
          body: "Enable this to transcribe audio files and convert them to text and to enable to Audio to Markdown"
        }
      }}
    />
    <SwitchInput
      size={Size.sm}
      {isDisabled}
      bind:checked={$userPreferences.localAI.markdownQAChat}
      on:change={onQuestionAnsweringToggle}
      isExpanded={true}
      label={{
        label: "Markdown Q & A  - 500MB",
        tooltip: {
          body: "Enable this to use AI to answer questions pertaining to markdown."
        }
      }}
    />
    {#if isDisabled}
      <span class="text-fgs3 text-b2">
        Please wait... Download in progress...
      </span>
      <!-- TODO - reenable after making it smooth with flickering effect -->
      <!-- <ProgressBar {progress} size={Size.lg} {label} /> -->
    {/if}
  </div>
  <footer class="flex flex-col items-center gap-4 pb-8 mo:pb-20">
    {#if isCmdBarLaunch}
      <p class="text-fgs2 text-b2 text-left">
        Note: You won't be able to Dismiss or perform any other action while the
        model download is in progress.
      </p>
      <div>
        <Button
          size={Size.md}
          label="Dismiss"
          type={ButtonVariant.PRIMARY}
          {isDisabled}
          on:click={() => {
            modalEvent.hide(Action.LOCAL_AI_SETTINGS);
          }}
        />
      </div>
    {:else}
      <InlineInfoBanner
        content="Please do not close this popup while the model download is in progress."
        type={InfoTextType.WARNING}
      />
    {/if}
  </footer>
</div>
