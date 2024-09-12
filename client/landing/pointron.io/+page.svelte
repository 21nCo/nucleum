<script lang="ts">
  import HeroSection from "../shared/HeroSection.svelte";
  import type { IHeroInputs, ITileItem } from "../shared/Landing.types";
  import {
    currentProductsStore,
    upcomingProductsStore
  } from "../shared/store/shared.store";
  import IrregularTileItemsSection from "../shared/tile/IrregularTileItemsSection.svelte";
  let heroInputs: IHeroInputs = {
    title: "The one focus time tracker that you will ever need",
    label:
      "In a world that constantly distracts, being time-aware is vital for productivity and personal wellbeing. Pointron simplifies this for you.",
    btn1: {
      label: "Download mobile app",
      iosDownloadUrl: "https://www.pointron.io/ios",
      androidDownloadUrl: "https://www.pointron.io/android"
    },
    btn2: {
      label: "Download desktop app",
      icon: "download",
      macDownloadUrl: "https://www.pointron.io/mac",
      windowsDownloadUrl: "https://www.pointron.io/windows"
    }
  };
  let products: ITileItem[] = [
    ...$currentProductsStore.slice(0, 2),
    ...$upcomingProductsStore.slice(0, 2)
  ];
</script>

<HeroSection {heroInputs} class="min-h-[70vh]" />
<IrregularTileItemsSection
  items={products}
  title="Navigating your productivity"
/>
<span
  class="flex text-h3 text-aps1 w-full h-full bg-bgs1 justify-center items-center"
>
  Pointron
</span>
