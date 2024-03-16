<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { fly } from "svelte/transition";
  import InlineLoadingAnimation from "../animations/InlineLoadingAnimation.svelte";
  export let loadingText: string = "Refreshing";
</script>

<div
  class="absolute w-full flex justify-center h-8 min-h-[2rem]"
  in:fly={{ y: -200, duration: 300 }}
  out:fly={{ y: -200, duration: 200 }}
>
  <span
    class="flex justify-center items-center shadow-md h-full min-h-full min-w-[9rem] w-36 gap-2 pl-6 pr-8 bg-aps1 text-b3 rounded-full {!$userPreferences
      .colorScheme.isActiveFgFg
      ? ' text-bgs1'
      : ''}"
  >
    <InlineLoadingAnimation />
    {loadingText}
  </span>
</div>
