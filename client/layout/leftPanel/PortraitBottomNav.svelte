<script lang="ts">
  import AppMenuSwitcher from "$lib/client/layout/leftPanel/appMenuSwitcher/AppMenuSwitcher.svelte";
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { player } from "$lib/client/components/modal/modal.store";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import { page } from "$app/stores";
  import { cn } from "$lib/client/utils/ui.utils";
  import LibrarySearchPortrait from "$lib/client/products/memotron/library/search/LibrarySearchPortrait.svelte";

  let testingInMobileBrowser: boolean = false;
  let isSearchFocused: boolean = false;
  let dev_isAppNavLibrarySearch: boolean = false;
  $: isLibraryActive =
    $page.params.route?.includes("library") ||
    $page.route.id?.includes("library");
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
    class={cn(
      "w-full min-w-min pb-8 pt-3 glassmenubar bg-bgs1 border-t border-brs2",
      {
        "rounded-t-[1rem]": dev_isAppNavLibrarySearch && isLibraryActive
      }
    )}
  >
    {#if dev_isAppNavLibrarySearch}
      <LibrarySearchPortrait isActive={isLibraryActive} bind:isSearchFocused />
    {/if}
    {#if !isSearchFocused}
      <AppMenuSwitcher
        layoutContext={LayoutContext.PORTRAIT}
        parentBackgroundIndex={0}
      />
    {/if}
  </div>
</div>
