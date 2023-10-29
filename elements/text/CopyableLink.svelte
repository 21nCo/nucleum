<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { bg } from "$lib/tidy/utils/theme.utils";
  import { copyToClipboard } from "$lib/tidy/utils/utils";
  import Icon from "../Icon.svelte";
  export let parentBackgroundIndex: number = 1;
  export let link: string = "";
  let copied = false;
  const copyLink = () => {
    copyToClipboard(link);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 1000);
  };
</script>

<button class="relative text-b2 cursor-pointer w-full" on:click={copyLink}>
  <div
    class="flex justify-between w-full px-3 py-2 text-fgs3 rounded-md border-none outline-none {bg(
      $userPreferences.theme,
      parentBackgroundIndex
    )}"
  >
    {link}
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
