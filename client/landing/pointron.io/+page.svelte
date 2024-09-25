<script lang="ts">
  import HeroSection from "../shared/HeroSection.svelte";
  import type { IHeroInputs, ITileItem } from "../shared/Landing.types";
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

  let features: ITileItem[] = [
    {
      title: "Powerful ways to focus",
      description:
        "Create a focus session in ways more effective than one can imagine",

      image: "focusitems"
    },
    {
      title: "infinitely nested goals",
      description:
        "In a more granular manner, you can create goals and infinitely nest sub goals, attach tags to goals to track your progress.",
      image: "goals"
    },
    {
      title: "Jounrnal",
      description: "",
      image: "quickfocus"
    },
    {
      title: "Focus goals and tasks",
      description:
        "You can work on single or multiple goals in a focus session. What's more? You can also work on tasks and add task estimations.",
      image: "custom"
    },
    {
      title: "Advanced analytics",
      description:
        "When its time, make thoughtful decisions or track the progress of your goals and sub goals using powerful analytics.",
      image: "analytics"
    },
    {
      title: "Perosnalize it your way",
      description:
        "Pointron doesn’t just help you manage time it adapts to you. Personalize your productivity experience with a variety of color schemes that cater to your taste.",
      image: "personalization"
    }
  ];
</script>

<HeroSection {heroInputs} class="min-h-[70vh]" />
<IrregularTileItemsSection
  items={features}
  title="Navigating your productivity"
/>
<span
  class="flex text-h3 text-aps1 w-full h-full bg-bgs1 justify-center items-center"
>
  Pointron
</span>
