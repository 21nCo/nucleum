<!--
  @component
  Phone back control: a swipe from the left screen edge, plus a back button at
  the left end of the bottom bar on base pages and overlays. An open resource
  shows its own back button in its floating bar, which follows the same trail.
  On an open resource back goes to the previous trail item or the base page;
  on any other base page it returns to the product's phone home page.
-->
<svelte:options runes={true} />

<script lang="ts">
  import { page } from "$app/stores";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { closeTopLayer } from "@nucleum/shell/navigation/top-layer";
  import { resolveModalOnFront } from "@21n/ui/actions/interaction-dom";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";
  import { player } from "@nucleum/shell/overlays/modal.store";
  import { cn } from "@21n/ui/environment/presentation";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";

  let { isAppMenuShown = false }: { isAppMenuShown?: boolean } = $props();

  const EDGE_WIDTH = 24;
  const SWIPE_DISTANCE = 72;
  const homeAction = requireProductConfig().homePathPt;
  const homePath = (
    requireCommandHost().resolveAction(homeAction)?.path ?? homeAction
  ).split("/")[0];

  const searchParams = $derived($page.url.searchParams);
  const isResourceOpen = $derived(
    !!searchParams.get(AccessMode.PAGE) ||
      !!searchParams.get(AccessMode.OVERLAY)
  );
  const isOnHome = $derived(
    $page.url.pathname.split("/").filter(Boolean)[0] === homePath
  );
  const isPageOpen = $derived(!!searchParams.get(AccessMode.PAGE));
  const isShown = $derived(isResourceOpen || !isOnHome);

  let swipeStart: { x: number; y: number } | undefined;

  function back() {
    if (searchParams.get(AccessMode.OVERLAY) && !isPageOpen) {
      closeTopLayer({ isIncludePanel: false });
      return;
    }
    if (navigation.backInTrail()) return;
    if (!isOnHome) navigation.gotoPath(`/${homeAction}`);
  }

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    swipeStart =
      isShown && touch && touch.clientX <= EDGE_WIDTH && !resolveModalOnFront()
        ? { x: touch.clientX, y: touch.clientY }
        : undefined;
  }

  function onTouchEnd(event: TouchEvent) {
    const touch = event.changedTouches[0];
    const start = swipeStart;
    swipeStart = undefined;
    if (!start || !touch || resolveModalOnFront()) return;
    const dx = touch.clientX - start.x;
    const dy = Math.abs(touch.clientY - start.y);
    if (dx >= SWIPE_DISTANCE && dy < dx / 2) back();
  }
</script>

<svelte:window
  ontouchstart={onTouchStart}
  ontouchend={onTouchEnd}
  ontouchcancel={() => (swipeStart = undefined)}
/>

{#if isShown && !isPageOpen}
  <button
    type="button"
    data-testid="portrait-back"
    aria-label="Back"
    class={cn(
      "fixed left-0 bottom-0 z-50 ml-3 flex h-11 w-11 items-center justify-center rounded-full border border-brs3 bg-bgs2 text-fgs1 shadow-md active:bg-bgs3",
      {
        "mb-[10.5rem]": $player.isMiniOn,
        "mb-24": !$player.isMiniOn && isAppMenuShown,
        "mb-8": !$player.isMiniOn && !isAppMenuShown
      }
    )}
    onclick={back}
  >
    <Icon icon="chevron-left" size={Size.md} />
  </button>
{/if}
