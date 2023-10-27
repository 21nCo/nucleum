<script lang="ts">
  import { onMount, tick } from "svelte";
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
  import { AppEvent } from "$lib/tidy/types/event.enum";
  let timer: any;
  bootup();
  onMount(async () => {
    await initialize();
    return () => {
      clearInterval(timer);
      //remove window event listeners
      window.removeEventListener("visibilitychange", () => {});
      window.removeEventListener("resize", () => {});
      window.removeEventListener("click", () => {});
    };
  });
  function bootup() {
    account.checkIfLoginExpired();
    setLaunchContext();
    addWindowEventListeners();
    runCurrentTime();
    inject({ mode: dev ? "development" : "production" });
  }
  async function initialize() {
    //todo - check if the saved timezone is different from current user timezone
    //todo - retrieve User preferences
    await initializeAppData();
    postMessageToParent({
      colorscheme: JSON.stringify($userPreferences.colorScheme),
    });
  }
  async function initializeAppData() {
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
  function runCurrentTime() {
    clearInterval(timer);
    timer = setInterval(() => {
      tick();
      $currentTime = new Date();
    }, 1000);
  }
  function setLaunchContext() {
    let subdomain = window?.location.host.split(".")[0];
    // console.log({ subdomain, location: window?.location });
    //appStore.setLaunchContext(LaunchContext.EMBED);
    if (subdomain === "embed" || subdomain === "embeddev") {
      appStore.setLaunchContext(LaunchContext.EMBED);
    }
  }
  function addWindowEventListeners() {
    window.addEventListener("visibilitychange", (event) => {
      appEvents.publish(AppEvent.WINDOW_VISIBILITY_CHANGED, event);
    });
    window.addEventListener("resize", (event) => {
      appEvents.publish(AppEvent.WINDOW_RESIZED, event);
    });
    window.addEventListener("click", (event: MouseEvent) => {
      appEvents.publish(AppEvent.WINDOW_CLICKED, event);
    });
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
