<script lang="ts">
  import Popover from "$lib/tidy/components/popover/Popover.svelte";

  import {
    appStore,
    popupEvent,
    postMessageToParent,
    windowObject,
  } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { fly } from "svelte/transition";
  import ComponentResolver from "../paint/ComponentResolver.svelte";
  import WithYStack from "../paint/painters/YStack/WithYStack.svelte";
  import { swipe } from "svelte-gestures";
  import { isShowAppearancePreview } from "$lib/tidy/stores/app.store";
  import { onMount } from "svelte";
  import type { PopupEvent } from "$lib/tidy/types/popup.type";
  import { LaunchContext } from "$lib/tidy/types/appStore.type";
  import Popup from "$lib/tidy/components/popover/Popup.svelte";
  let popups: PopupEvent[] = [];
  let dialogRef: HTMLDialogElement;
  function onSwipe(event: any) {
    console.log({ event });
  }
  $: if (dialogRef) dialogRef.showModal();
  onMount(() => {
    popupEvent.subscribe((x: PopupEvent) => {
      console.log({ x });
      if ($appStore.launchContext == LaunchContext.EMBED) {
        appStore.log("is embed");
        postMessageToParent({
          pop: JSON.stringify(x),
        });
      } else {
        if (x.path && x.isShow) {
          popups = [...popups, x];
          console.log({ popups });
        } else {
          popups = popups.filter((y) => y.path != x.path);
        }
      }
    });
  });
</script>

{#if $appStore.fullScreenComponentPath}
  <div
    class="fixed left-0 top-0 w-full h-full flex flex-col z-40"
    transition:fly={{ y: 200, duration: 100 }}
    use:swipe={{ timeframe: 300, minSwipeDistance: 60 }}
    on:swipe={onSwipe}
  >
    {#if $windowObject.isInPortraitMode}
      <button
        class="pt-4 pb-6 px-4 flex w-full justify-center bg-bgs1 -mb-1"
        on:click={() => {
          appStore.hideFullScreenPlayer();
        }}
      >
        <div class="h-1 bg-bgs3 w-1/3 rounded-full" />
        <!-- <Icon icon="collapse" color="fgs2" /> -->
      </button>
    {/if}
    <ComponentResolver path={$appStore.fullScreenComponentPath} />
  </div>
{/if}
<Popover
  size={Size.xl}
  bind:show={$isShowAppearancePreview}
  isOnRight={true}
  isShowOverlay={false}
  title={"Appearance"}
>
  <WithYStack
    path={"settings/appearance"}
    params={{ parentBackgroundIndex: 2, hidePageHeading: true }}
  />
</Popover>
{#each popups as popup}
  <Popup {popup} />
{/each}
