<script lang="ts">
  import Modal from "$lib/client/components/modal/Modal.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import view from "$lib/client/stores/view.store";
  import { addAnimateClass, bounce, cn } from "$lib/client/utils/ui.utils";
  import type { ITileItem } from "./Landing.types";
  import PanelButton from "./elements/PanelButton.svelte";
  import {
    currentProductsStore,
    isProductsPanelOpen,
    upcomingProductsStore
  } from "./store/shared.store";
  import TileItemsPanel from "./tile/TileItemsPanel.svelte";

  const id: string = "right-panel";
  const currentProducts: ITileItem[] = $currentProductsStore.map((x) => {
    return {
      title: x.title,
      image: x.image,
      description: x.label,
      href: x?.href
    };
  });
  const upcomingProducts: ITileItem[] = $upcomingProductsStore.map((x) => {
    return {
      title: x.title,
      description: x.label,
      href: x?.href
    };
  });
</script>

{#if $isProductsPanelOpen}
  <div
    class={cn(
      "fixed w-[100vw] h-[100vh] z-[51]",
      !$appearance.colorScheme.isDark &&
        !$view.isPortrait &&
        "bg-[hsla(0,0%,0%,0.3)]",
      $appearance.colorScheme.isDark &&
        !$view.isPortrait &&
        "bg-[hsla(0,0%,100%,0.3)]"
    )}
    on:click={async () => {
      await addAnimateClass("animate-close-right", "products-panel");
      $isProductsPanelOpen = false;
    }}
    on:keypress
    role="button"
    tabindex="0"
  >
    <TileItemsPanel {currentProducts} {upcomingProducts} />
  </div>
{/if}
<PanelButton
  {id}
  label="Products"
  icon="ham-burger-menu"
  on:click={async () => {
    await addAnimateClass("animate-bounce-r", id);
    $isProductsPanelOpen = true;
  }}
/>
