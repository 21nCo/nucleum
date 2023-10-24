<script lang="ts">
  import { EventType } from "$lib/tidy/types/event.enum";
  import { onMount, tick } from "svelte";
  import type { CustomEvent } from "$lib/tidy/types/event.type";

  import DebugLayer from "./DebugLayer.svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import {
    account,
    appEvents,
    appStore,
    currentTime,
    postMessageToParent,
    userPreferences,
  } from "$lib/tidy/stores/app.store";
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";
  import { performBlankApiCall } from "$lib/tidy/utils/utils";
  import { defaultAppData } from "$lib/local/stores/local.store";
  import { LaunchContext } from "$lib/tidy/types/appStore.type";
  import ModalLayer from "./ModalLayer.svelte";
  let isShowAppearancePopover: boolean = false;

  let timer: any;
  onMount(() => {
    bootup();
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
  function bootup() {
    account.checkIfIsLoggedIn();
    //todo - check if the saved timezone is different from current user timezone
    let subdomain = window?.location.host.split(".")[0];
    // console.log({ subdomain, location: window?.location });
    if (subdomain === "embed" || subdomain === "embeddev") {
      appStore.setLaunchContext(LaunchContext.EMBED);
    }
    //todo - retrieve User preferences
    retrieveAppData();
    postMessageToParent({
      colorscheme: JSON.stringify($userPreferences.colorScheme),
    });
    inject({ mode: dev ? "development" : "production" });
  }
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
<ModalLayer />
