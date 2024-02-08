<script lang="ts">
  import AppNameWithVersion from "./AppNameWithVersion.svelte";
  import BlankLabsFooter from "./BlankLabsFooter.svelte";
  export let isHideAppVersion = false;
  export let isComingSoon: boolean = false;
</script>

<div
  class="flex flex-col justify-center items-center w-full text-fgs3 text-b3 pt-20"
>
  <div class="flex justify-center text-b4">
    {#if !isHideAppVersion}
      <AppNameWithVersion />
    {/if}
  </div>
  <BlankLabsFooter {isComingSoon} />
</div>
