<script lang="ts">
  import HeroSection from "../shared/HeroSection.svelte";
  import type { IHeroInputs } from "../shared/Landing.types";
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
</script>

<HeroSection {heroInputs} class="min-h-[70vh]" />
<span
  class="flex text-h3 text-aps1 w-full h-full bg-bgs1 justify-center items-center"
>
  Pointron
</span>
