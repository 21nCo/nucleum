<script lang="ts">
  import { onMount } from "svelte";
  import {
    PlainCSSFgs2,
    appEvents,
    tailwindTheme,
    userPreferences,
    windowObject
  } from "$lib/tidy/stores/app.store";
  import { AppTheme } from "$lib/tidy/types/theme.type";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import { persistLocally } from "$lib/tidy/stores/persistance";
  import { Item } from "$lib/tidy/types/item.enum";
  import { postToParent } from "$lib/tidy/utils/embed.utils";
  handleResize();
  let fontFamily: string = "Avenir";
  let defaultRootFontSize: number = 16;
  $: rootFontSize = defaultRootFontSize + 0.6 * $windowObject.scale;
  $: document.documentElement.style.fontSize = `${rootFontSize}px`;
  function handleResize() {
    windowObject.updateDoumentDimensions(window.innerWidth, window.innerHeight);
  }
  onMount(() => {
    refreshTheme();
    const appEventSub = appEvents.subscribe((e) => {
      if (e.event == AppEvent.WINDOW_RESIZED) {
        handleResize();
      }
    });
    const userPrefSub = userPreferences.subscribe((preferences) => {
      $PlainCSSFgs2 = preferences.colorScheme.colors.fgs2;
      refreshTheme();
    });
    return () => {
      appEventSub();
      userPrefSub();
    };
  });

  function refreshTheme() {
    refreshSizing();
    refreshTailwind();
  }
  function refreshSizing() {
    if ($userPreferences.accessibilitySizingFactor == 0) {
      if ($windowObject.scale > 0.55) defaultRootFontSize = 14;
      else defaultRootFontSize = 12;
    } else if ($userPreferences.accessibilitySizingFactor == 1) {
      if ($windowObject.scale > 0.55) defaultRootFontSize = 16;
      else if ($windowObject.scale > 0.45) defaultRootFontSize = 14;
      else defaultRootFontSize = 13;
    } else if ($userPreferences.accessibilitySizingFactor == 2) {
      if ($windowObject.scale > 0.55) defaultRootFontSize = 18;
      else defaultRootFontSize = 16;
    }
  }
  function refreshTailwind() {
    fontFamily =
      $userPreferences.theme === AppTheme.Clean ? "Avenir" : "Avenir";
    //BlinkMacSystemFont Cantarell Nunito sans-serif
    $tailwindTheme = `${$userPreferences.theme} ${"medium"} ${
      $userPreferences.colorScheme?.tailwindSelector ?? "cs_pointron_light"
    }`;
    persistLocally(Item.TailwindTheme, $tailwindTheme);
    document.documentElement.style.setProperty(
      "--fontFamily-sans-0",
      fontFamily
    );
    postToParent({
      colorscheme: JSON.stringify($userPreferences.colorScheme),
      rootFontSize
    });
  }
</script>

<div
  class="flex h-full w-full {$userPreferences.theme == AppTheme.Glassy
    ? 'glassy' + $userPreferences.colorScheme?.label
    : ''}"
>
  <slot />
</div>

<style>
  .glass {
    background-image: url(back.png);
  }

  .glassylavendar {
    background: linear-gradient(
      to left bottom,
      rgb(165, 180, 252),
      rgb(192, 132, 252)
    );
  }
  .glassytest {
    background: linear-gradient(
      to left bottom,
      rgb(17, 24, 39),
      rgb(75, 85, 99)
    );
  }
  .glassysoftmetal {
    background: conic-gradient(
      at left bottom,
      rgb(199, 210, 254),
      rgb(71, 85, 105),
      rgb(199, 210, 254)
    );
  }
  .glassyice {
    background: linear-gradient(
      to left bottom,
      rgb(255, 228, 230),
      rgb(204, 251, 241)
    );
  }
  .glassypowerpuff {
    background: linear-gradient(
      to left bottom,
      rgb(56, 189, 248),
      rgb(251, 113, 133),
      rgb(163, 230, 53)
    );
  }
  .glassymidnight {
    background: linear-gradient(
      to left bottom,
      rgb(29, 78, 216),
      rgb(30, 64, 175),
      rgb(17, 24, 39)
    );
  }
  .glassysunset {
    background: linear-gradient(
      to right top,
      rgb(199, 210, 254),
      rgb(254, 202, 202),
      rgb(254, 249, 195)
    );
  }
  .glassygunmetal {
    background: linear-gradient(
      to left bottom,
      rgb(229, 231, 235),
      rgb(156, 163, 175),
      rgb(75, 85, 99)
    );
  }
  .glassygotham {
    background: linear-gradient(
      to right top,
      rgb(55, 65, 81),
      rgb(17, 24, 39),
      rgb(0, 0, 0)
    );
  }
  .glassy5 {
    /* Created with https://www.css-gradient.com */
    background: #1c684e;
    background: -webkit-linear-gradient(top left, #1c684e, #76c574);
    background: -moz-linear-gradient(top left, #1c684e, #76c574);
    background: linear-gradient(to bottom right, #1c684e, #76c574);
  }
  .glassyblue {
    /* https://www.css-gradient.com/?c1=4facaf&c2=3c3263&gt=l&gd=dtr */
    background: #4facaf;
    background: -webkit-linear-gradient(top right, #4facaf, #3c3263);
    background: -moz-linear-gradient(top right, #4facaf, #3c3263);
    background: linear-gradient(to bottom left, #4facaf, #3c3263);
  }

  .glassyrainbow {
    /* Created with https://www.css-gradient.com */
    background: #3c98a8;
    background: -webkit-linear-gradient(bottom left, #3c98a8, #d700ae);
    background: -moz-linear-gradient(bottom left, #3c98a8, #d700ae);
    background: linear-gradient(to top right, #3c98a8, #d700ae);
  }
  .glassy4old {
    /* https://www.css-gradient.com/?c1=8a8397&c2=11858a&gt=l&gd=dbl */
    background: #8a8397;
    background: -webkit-linear-gradient(bottom left, #8a8397, #11858a);
    background: -moz-linear-gradient(bottom left, #8a8397, #11858a);
    background: linear-gradient(to top right, #8a8397, #11858a);
  }
  .glassy4 {
    /* https://www.css-gradient.com/?c1=8a8397&c2=11858a&gt=l&gd=dbl */
    background: #11858a;
    background: -webkit-linear-gradient(bottom left, #11858a, #8a8397);
    background: -moz-linear-gradient(bottom left, #11858a, #8a8397);
    background: linear-gradient(to top right, #11858a, #8a8397);
  }
  .glassygreeny {
    /* https://www.css-gradient.com/?c1=246773&c2=969e53&gt=l&gd=dbl */
    background: #246773;
    background: -webkit-linear-gradient(bottom left, #246773, #969e53);
    background: -moz-linear-gradient(bottom left, #246773, #969e53);
    background: linear-gradient(to top right, #246773, #969e53);
  }
  .glassygreenlight {
    /* light */
    /* https://www.css-gradient.com/?c1=c8cbe6&c2=8afdbc&gt=l&gd=dbl */
    /* Created with https://www.css-gradient.com */
    background: #c8cbe6;
    background: -webkit-linear-gradient(bottom left, #c8cbe6, #8afdbc);
    background: -moz-linear-gradient(bottom left, #c8cbe6, #8afdbc);
    background: linear-gradient(to top right, #c8cbe6, #8afdbc);
  }
  .glassy7 {
    /* https://www.css-gradient.com/?c1=f63251&c2=eaac89&gt=l&gd=dbl */
    /* Created with https://www.css-gradient.com */
    background: #f63251;
    background: -webkit-linear-gradient(bottom left, #f63251, #eaac89);
    background: -moz-linear-gradient(bottom left, #f63251, #eaac89);
    background: linear-gradient(to top right, #f63251, #eaac89);
  }
</style>
