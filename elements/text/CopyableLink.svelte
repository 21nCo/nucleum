<script lang="ts">
  import { copyToClipboard } from "$lib/tidy/utils/utils";
  import { onMount } from "svelte";

  export let link: string = "";

  let copied = false;

  const copyLink = () => {
    copyToClipboard(link);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 3000);
  };

  onMount(() => {
    setTimeout(() => {
      copied = false;
    }, 3000);
  });
</script>

<div class="relative">
  <input
    type="text"
    value={link}
    class="w-full px-3 py-2 text-fgs3 text-b2 rounded-md border-brs1 shadow-sm focus:border-a1 focus:ring-1 focus:ring-a1 focus:ring-opacity-50"
    readonly
  />
  <button
    class="absolute top-0 right-0 px-3 py-2 bg-a1 text-bgs1 rounded-md hover:bg-a1 focus:outline-none focus:bg-a1"
    on:click={copyLink}
  >
    {copied ? "Copied!" : "Copy"}
  </button>
</div>
