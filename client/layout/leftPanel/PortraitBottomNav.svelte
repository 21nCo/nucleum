<script lang="ts">
  import AppMenuSwitcher from "$lib/client/layout/leftPanel/appMenuSwitcher/AppMenuSwitcher.svelte";
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { player } from "$lib/client/components/modal/modal.store";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  let testingInMobileBrowser: boolean = false;
</script>

<div
  class="absolute {testingInMobileBrowser
    ? 'bottom-14'
    : 'bottom-0'} flex flex-col justify-center items-center z-30 w-full"
>
  {#if $player.isMiniOn}
    <ComponentResolver path={$player.action} />
  {/if}
  <div
    class=" border-t border--bgs2 w-full min-w-min pb-8 pt-3 glassmenubar bg-bgs1 border-brs1"
  >
    <AppMenuSwitcher
      layoutContext={LayoutContext.PORTRAIT}
      parentBackgroundIndex={0}
    />
  </div>
</div>
