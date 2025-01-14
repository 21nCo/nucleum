<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import LeftNavExpandable from "./LeftNavExpandable.svelte";
  import LeftNavFixed from "./LeftNavFixed.svelte";
  import PortraitBottomNav from "./PortraitBottomNav.svelte";
  export let variant: "fixed" | "expandable" = "expandable";

  let isInFocusMode = false;
  let isRounded = false;
  // $: isRounded = $appearance.skin === AppSkin.Glassy ? true : false;
  function handleFocusMode(e: CustomEvent<boolean>) {
    if (typeof e.detail === "boolean") {
      isInFocusMode = e.detail;
    }
  }
</script>

{#if !$appStore.isMenuHidden && !isInFocusMode}
  {#if $view.isPortrait}
    <PortraitBottomNav />
  {:else if variant === "expandable"}
    <LeftNavExpandable {isRounded} />
  {:else if variant === "fixed"}
    <LeftNavFixed {isRounded} />
  {/if}
{/if}

<svelte:window on:focusMode={handleFocusMode} />
