<script lang="ts">
  import { onMount } from "svelte";
  import {
    appStore,
    userPreferences,
    windowObject,
  } from "$lib/tidy/stores/app.store";
  let sizeFactor: string = "medium";
  let fontFamily: string = "Avenir";
  let defaultRootFontSize: number = 16;
  $: rootFontSize = defaultRootFontSize + 0.6 * $windowObject.scale;
  $: document.documentElement.style.fontSize = `${rootFontSize}px`;
  $: console.log({ rootFontSize });
  function handleResize() {
    windowObject.updateDoumentDimensions(window.innerWidth, window.innerHeight);
  }
  onMount(() => {
    handleResize();
    refreshTheme();
    window.addEventListener("resize", handleResize);
    userPreferences.subscribe(() => {
      refreshTheme();
    });
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });
  function refreshTheme() {
    refreshSizing();
    refreshTailwind();
  }
  function refreshSizing() {
    if ($userPreferences.accessibilitySizingFactor == 0) {
      defaultRootFontSize = 14;
    } else if ($userPreferences.accessibilitySizingFactor == 1) {
      defaultRootFontSize = 16;
    } else if ($userPreferences.accessibilitySizingFactor == 2) {
      defaultRootFontSize = 18;
    }
  }
  function refreshTailwind() {
    fontFamily = $userPreferences.theme === "Clean" ? "Avenir" : "Avenir";
    $appStore.tailwindTheme = `${
      $userPreferences.theme.toLowerCase() ?? "clean"
    } ${"medium"} ${$userPreferences.colorScheme?.label ?? "light"}`;
    document.documentElement.style.setProperty(
      "--fontFamily-sans-0",
      fontFamily
    );
    sendMessageToParent();
  }
  function sendMessageToParent() {
    const message = { theme: $appStore.tailwindTheme, rootFontSize };
    parent.postMessage(message, "*");
  }
</script>

<div
  class="flex h-screen w-screen {$userPreferences.theme == 'Colorful'
    ? $userPreferences.tempColorScheme
    : ''}"
>
  <slot />
</div>

<style>
  .glass {
    background-image: url(back.png);
  }
  .scheme1 {
    /* Created with https://www.css-gradient.com */
    background: #1c684e;
    background: -webkit-linear-gradient(top left, #1c684e, #76c574);
    background: -moz-linear-gradient(top left, #1c684e, #76c574);
    background: linear-gradient(to bottom right, #1c684e, #76c574);
  }
  .scheme2 {
    /* https://www.css-gradient.com/?c1=4facaf&c2=3c3263&gt=l&gd=dtr */
    background: #4facaf;
    background: -webkit-linear-gradient(top right, #4facaf, #3c3263);
    background: -moz-linear-gradient(top right, #4facaf, #3c3263);
    background: linear-gradient(to bottom left, #4facaf, #3c3263);
  }

  .scheme3 {
    /* Created with https://www.css-gradient.com */
    background: #3c98a8;
    background: -webkit-linear-gradient(bottom left, #3c98a8, #d700ae);
    background: -moz-linear-gradient(bottom left, #3c98a8, #d700ae);
    background: linear-gradient(to top right, #3c98a8, #d700ae);
  }
  .scheme4 {
    /* https://www.css-gradient.com/?c1=8a8397&c2=11858a&gt=l&gd=dbl */
    background: #8a8397;
    background: -webkit-linear-gradient(bottom left, #8a8397, #11858a);
    background: -moz-linear-gradient(bottom left, #8a8397, #11858a);
    background: linear-gradient(to top right, #8a8397, #11858a);
  }
  .scheme5 {
    /* https://www.css-gradient.com/?c1=246773&c2=969e53&gt=l&gd=dbl */
    background: #246773;
    background: -webkit-linear-gradient(bottom left, #246773, #969e53);
    background: -moz-linear-gradient(bottom left, #246773, #969e53);
    background: linear-gradient(to top right, #246773, #969e53);
  }
  .scheme6 {
    /* light */
    /* https://www.css-gradient.com/?c1=c8cbe6&c2=8afdbc&gt=l&gd=dbl */
    /* Created with https://www.css-gradient.com */
    background: #c8cbe6;
    background: -webkit-linear-gradient(bottom left, #c8cbe6, #8afdbc);
    background: -moz-linear-gradient(bottom left, #c8cbe6, #8afdbc);
    background: linear-gradient(to top right, #c8cbe6, #8afdbc);
  }
  .scheme7 {
    /* https://www.css-gradient.com/?c1=f63251&c2=eaac89&gt=l&gd=dbl */
    /* Created with https://www.css-gradient.com */
    background: #f63251;
    background: -webkit-linear-gradient(bottom left, #f63251, #eaac89);
    background: -moz-linear-gradient(bottom left, #f63251, #eaac89);
    background: linear-gradient(to top right, #f63251, #eaac89);
  }
</style>
