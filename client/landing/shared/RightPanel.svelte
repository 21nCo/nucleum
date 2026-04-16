<script lang="ts">
  // import Modal from "$lib/client/components/modal/Modal.svelte";
  import appearance from "@21n/stores/appearance.store";
  import view from "@21n/stores/view.store";
  import { addAnimateClass, bounce, cn } from "@21n/utils/ui.utils";
  import type { ITileItem } from "@21n/landing/shared/landing.type";
  import PanelButton from "@21n/landing/shared/elements/PanelButton.svelte";
  import {
    currentProductsStore,
    isProductsPanelOpen,
    upcomingProductsStore
  } from "@21n/landing/shared/store/shared.store";
  import TileItemsPanel from "@21n/landing/shared/tile/TileItemsPanel.svelte";

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

  async function closeProductsPanel() {
    await addAnimateClass("animate-close-right", "products-panel");
    $isProductsPanelOpen = false;
  }

  function handleOverlayKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void closeProductsPanel();
    }
  }
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
    onclick={closeProductsPanel}
    onkeydown={handleOverlayKeydown}
    role="button"
    tabindex="0"
  >
    <TileItemsPanel {currentProducts} {upcomingProducts} />
  </div>
{/if}
<PanelButton
  {id}
  isRightPanel={true}
  label="Products"
  description="Products from 21n"
  icon="long-arrow-right"
  onclick={async () => {
    await addAnimateClass("animate-bounce-r", id);
    $isProductsPanelOpen = true;
  }}
/>
