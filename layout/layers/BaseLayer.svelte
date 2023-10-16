<script lang="ts">
  import { EventType } from "$lib/tidy/types/event.enum";
  import { onMount, tick } from "svelte";
  import type { CustomEvent } from "$lib/tidy/types/event.type";

  import DebugLayer from "./DebugLayer.svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import {
    appEvents,
    appStore,
    currentTime,
    postMessageToParent,
    userPreferences,
  } from "$lib/tidy/stores/app.store";
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";
  import { performApiCall, performBlankApiCall } from "$lib/tidy/utils/utils";
  import { defaultAppData } from "$lib/local/stores/local.store";
  import { LaunchContext } from "$lib/tidy/types/appStore.type";
  import PopupLayer from "./PopupLayer.svelte";
  let isShowAppearancePopover: boolean = false;

  let timer: any;
  onMount(() => {
    let subdomain = window?.location.host.split(".")[0];
    // console.log({ subdomain, location: window?.location });
    if (subdomain) {
      appStore.setLaunchContext(LaunchContext.DEFAULT);
    }
    //todo - retrieve User preferences
    retrieveAppData();
    postMessageToParent({
      colorscheme: JSON.stringify($userPreferences.colorScheme),
    });
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
<PopupLayer />
