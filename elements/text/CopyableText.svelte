<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import type { InfoTextParams } from "$lib/tidy/types/text.type";
  import { bgClass } from "$lib/tidy/utils/theme.utils";
  import { copyToClipboard } from "$lib/tidy/utils/utils";
  import Icon from "../Icon.svelte";
  import FormControlLabelWrapper from "../input/FormControlLabelWrapper.svelte";
  export let parentBackgroundIndex: number = 1;
  export let infoParams: InfoTextParams | undefined = undefined;
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

<FormControlLabelWrapper info={infoParams} {label}>
  <button class="relative text-b2 cursor-pointer w-full" on:click={copyText}>
    <div
      class="flex justify-between w-full px-3 py-2 text-fgs3 rounded-md border-none outline-none {bgClass(
        $userPreferences.theme,
        parentBackgroundIndex
      )}"
    >
      {text}
      <Icon icon="copy" />
    </div>
    {#if copied}
      <div
        class="absolute top-0 right-0 w-full bg-bgs4 bg-opacity-90 h-full flex items-center justify-center rounded-md"
      >
        copied!
      </div>
    {/if}
  </button>
</FormControlLabelWrapper>
