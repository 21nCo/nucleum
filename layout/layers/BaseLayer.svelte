<script lang="ts">
  import { swipe } from "svelte-gestures";
  import { EventType } from "$lib/tidy/types/event.enum";
  import { onMount, tick } from "svelte";
  import type { CustomEvent } from "$lib/tidy/types/event.type";
  import Popover from "$lib/tidy/components/popover/Popover.svelte";
  import { Size } from "$lib/tidy/types/size.enum";

  import DebugLayer from "./DebugLayer.svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import {
    appEvents,
    appStore,
    currentTime,
    userPreferences,
    windowObject,
  } from "$lib/tidy/stores/app.store";
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  import Collapse from "$lib/tidy/icons/Collapse.svelte";
  import WithYStack from "../paint/painters/YStack/WithYStack.svelte";
  import { isShowAppearancePreview } from "$lib/tidy/stores/app.store";
  import { fade, fly, slide } from "svelte/transition";
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";
  import { performApiCall, performBlankApiCall } from "$lib/tidy/utils/utils";
  import { defaultAppData } from "$lib/local/stores/local.store";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  let isShowAppearancePopover: boolean = false;

  let timer: any;
  onMount(() => {
    let subdomain = window?.location.host.split(".")[0];
    // console.log({ subdomain, location: window?.location });
    if (subdomain) {
      appStore.setLaunchContext("embed");
    }
    //todo - retrieve User preferences
    retrieveAppData();
    //window.webkit?.messageHandlers.iOSNative.postMessage({colorscheme: $userPreferences.colorScheme});
    inject({ mode: dev ? "development" : "production" });
    appEvents.subscribe((x: CustomEvent) => {
      if (x.type == EventType.SHOW_APPEARANCE_PREVIEW) {
        isShowAppearancePopover = x.value ?? false;
      }
    });

    clearInterval(timer);
    timer = setInterval(() => {
      tick();
      $currentTime = new Date();
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  });
  async function retrieveAppData() {
    const app = import.meta.env.VITE_APP ?? window.location.hostname;
    appStore.initiatizeAppData(defaultAppData);
    if (!app) return;
    try {
      let response = await performBlankApiCall(
        "appdata",
        "POST",
        JSON.stringify({ app })
      );
      if (response && response.ok) {
        let jsonValue = await response.json();
        if (jsonValue) {
          appStore.initiatizeAppData(jsonValue);
        }
      }
    } catch (err) {
      appStore.logError(err);
    }
  }
  function onSwipe(event: any) {
    console.log({ event });
  }
</script>

<title>{$appStore.appData.name}</title>
<div class="flex h-screen w-screen">
  <ThemeLayer>
    <slot />
  </ThemeLayer>
</div>
{#if $appStore.isDebugMode}
  <DebugLayer />
{/if}
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
