<script lang="ts">
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { kindleSyncState } from "../contentScripts/KindleHighlights.types";
  let isHovering = false;
  export let syncState;
</script>

<HoverableElement
  type="button"
  bind:isHovering
  class="fixed right-0 top-52 w-6 h-6 hover:w-20 bg-ass1 text-bgs1 dark:text-fgs1 rounded-l-full border-l border-y border-brs3 shadow-md flex px-1 items-center justify-center"
  on:click
>
  <Icon
    icon={syncState == kindleSyncState.Syncing
      ? "upload"
      : syncState == kindleSyncState.Synced
        ? "check-circle"
        : "sync"}
    class="stroke-bgs1 dark:stroke-fgs1 ml-1"
  />
  {isHovering
    ? syncState == kindleSyncState.Syncing
      ? " Syncing"
      : syncState == kindleSyncState.Synced
        ? " Synced"
        : " Sync"
    : ""}
</HoverableElement>
