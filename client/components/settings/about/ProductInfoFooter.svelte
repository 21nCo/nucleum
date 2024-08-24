<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import AppNameWithVersion from "./AppNameWithVersion.svelte";
  import BlankLabsFooter from "./BlankLabsFooter.svelte";
  import SystemStatus from "./SystemStatus.svelte";
  export let isHideAppVersion = false;
  export let isComingSoon: boolean = false;
  export let isShowSystemStatus: boolean = false;
</script>

<div
  class={cn("flex items-center w-full pt-10", {
    "justify-between": isShowSystemStatus,
    "justify-center": !isShowSystemStatus
  })}
>
  <div
    class={cn("flex flex-col justify-center  text-fgs3 text-b3", {
      "items-start": isShowSystemStatus,
      "items-center": !isShowSystemStatus
    })}
  >
    <div class="flex justify-center text-b4">
      {#if !isHideAppVersion}
        <AppNameWithVersion />
      {/if}
    </div>
    <BlankLabsFooter {isComingSoon} />
  </div>
  {#if isShowSystemStatus}
    <SystemStatus />
  {/if}
</div>
