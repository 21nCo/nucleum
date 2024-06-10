<script lang="ts">
  import type { FormLabelInfoTooltip } from "$lib/client/types/text.type";
  import { copyToClipboard } from "$lib/client/utils/utils";
  import Icon from "../Icon.svelte";
  import FormControlLabelWrapper from "./formLabel/FormControlLabelWrapper.svelte";
  import BackgroundElement from "../style/BackgroundElement.svelte";
  export let parentBackgroundIndex: number = 1;
  export let infoParams: FormLabelInfoTooltip | undefined = undefined;
  export let label: string = "";
  export let text: string = "";
  let copied = false;
  const copyText = () => {
    copyToClipboard(text);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 1000);
  };
</script>

<FormControlLabelWrapper props={{ label, tooltip: infoParams }}>
  <button class="relative text-b2 cursor-pointer w-full" on:click={copyText}>
    <BackgroundElement
      class="flex justify-between w-full px-3 py-2 text-fgs3 rounded-md border-none outline-none"
      parentBgIndex={parentBackgroundIndex}
    >
      {text}
      <Icon icon="copy" />
    </BackgroundElement>
    {#if copied}
      <div
        class="absolute top-0 right-0 w-full bg-bgs4 bg-opacity-90 h-full flex items-center justify-center rounded-md"
      >
        copied!
      </div>
    {/if}
  </button>
</FormControlLabelWrapper>
