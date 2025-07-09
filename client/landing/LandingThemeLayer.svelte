<script lang="ts">
  import { onMount } from "svelte";
  import view from "$lib/client/stores/view.store";
  import appearance, {
    fallBackTypefaceString
  } from "$lib/client/stores/appearance.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import "@fontsource-variable/space-grotesk";
  import "@fontsource-variable/hanken-grotesk";
  import "@fontsource-variable/sen";
  import "@fontsource/noto-color-emoji";

  export let extensionContext: string | undefined = undefined;
  let fontFamily: string = "Avenir";
  let defaultRootFontSize: number = 16;
  let rootFontSize: number = defaultRootFontSize + 0.6 * $view?.scale;
  let ref: HTMLDivElement;
  let typeface = "Sen";

  onMount(() => {
    refreshTailwind();
    refreshSizing();
    const appearanceSub = appearance.subscribe(() => {
      refreshTailwind();
    });
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    appearance.setSystemTheme(darkModeMediaQuery.matches);
    darkModeMediaQuery.addEventListener("change", (e) => {
      appearance.setSystemTheme(e.matches);
    });
    return () => {
      appearanceSub();
    };
  });

  /**
   *
   *
   * _Notes on extension context:_
   * `shadowRoot.host.style.fontSize` doesn't effect the font size of the extension as tailwind relies on root font size for rem units and in a shadow root extention context, rem units are not reliable as web pages may have different root font size. For now, @thedutchcoder/postcss-rem-to-px is being used as a postcss plugin to convert rem to px during build time as a workaround.
   *
   */
  function refreshSizing() {
    if ($view.scale > 0.55) defaultRootFontSize = 16;
    else if ($view.scale > 0.45) defaultRootFontSize = 14;
    else defaultRootFontSize = 13;

    rootFontSize = defaultRootFontSize + 0.6 * $view.scale;

    const dom = document.getElementById(extensionContext + "-root");
    if (extensionContext && dom) {
      const shadowRoot = dom.shadowRoot;
      if (!shadowRoot) return;
      shadowRoot.host.style.fontSize = `${rootFontSize + 20}px`;
    } else if (!extensionContext) {
      document.documentElement.style.fontSize = `${rootFontSize}px`;
    }
  }

  /**
   *
   * Sending the colorscheme to the parent in embed context.
   *
   * Note: most of the colors are reassigned to new object instead of posting $appearance.colorScheme directly as the original json contains keys which are not accepted by the iOS app.
   */
  function refreshTailwind() {
    fontFamily = typeface + ", " + fallBackTypefaceString;
    if (extensionContext && ref) {
      const element = ref as unknown as HTMLElement;
      element.style.setProperty("--fontFamily-sans-0", fontFamily);
      element.style.fontFamily = fontFamily;
      return;
    }
    document.documentElement.style.setProperty(
      "--fontFamily-sans-0",
      fontFamily
    );
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Hanken+Grotesk:ital,wght@0,100..900;1,100..900&family=Sen:wght@400..800&family=Parkinsans:wght@300..800&family=Sora:wght@100..800&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&family=Nunito:ital,wght@0,200..1000;1,200..1000&family=Teachers:ital,wght@0,400..800;1,400..800&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<!--Note: The font weight and tracking corrections are applied for each typeface. Space Grotesk is falling back to next available typeface if font-normal (or 400) is used. For some reason, 401 and beyond is working fine. -->
<div
  bind:this={ref}
  id={extensionContext ? "nthemeclipper" : "ntheme"}
  class={cn("flex h-full w-full", {
    "tracking-[0.01em]": typeface === "Hanken Grotesk",
    "font-[350]": typeface === "Sora",
    "font-[401]": typeface === "Space Grotesk",
    dark: $appearance?.colorScheme?.isDark
  })}
>
  <slot />
</div>
