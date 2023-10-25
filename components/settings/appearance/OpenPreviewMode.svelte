<!-- <script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/tidy/elements/Button.svelte";
  import {
    isShowAppearancePreview,
    windowObject,
  } from "$lib/tidy/stores/app.store";
</script>

{#if $isShowAppearancePreview}
  <Button
    on:click={() => {
      isShowAppearancePreview.set(false);
    }}
    label="Close Preview Mode"
  />
{:else}
  <Button
    on:click={() => {
      isShowAppearancePreview.set(true);
      windowObject.gotoPath("/point");
    }}
    label="Open Preview Mode"
  />
{/if} -->
