<script lang="ts">
  import HeroVideo from "../shared/elements/HeroVideo.svelte";
  import HeroSection from "../shared/HeroSection.svelte";
  import type { IHeroInputs, ITileItem } from "../shared/Landing.types";
  import IrregularTileItemsSection from "../shared/tile/IrregularTileItemsSection.svelte";
  let heroInputs: IHeroInputs = {
    tagline: "Your focus haven",
    description:
      "Track time, achieve goals and form habits with Pointron, your personal productivity companion.",
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

  const staticUrl = import.meta.env.VITE_STATIC_URL;

  let features: ITileItem[] = [
    {
      title: "Powerful ways to focus",
      description:
        "Create a focus session in ways more effective than one can imagine",

      image: staticUrl + "/pointron/landing/focusitems.gif"
    },
    {
      title: "Infinitely nested goals",
      description:
        "In a more granular manner, you can create goals and infinitely nest sub goals, associate tasks to goals to track your progress.",
      image: staticUrl + "/pointron/landing/goals.gif"
    },
    {
      title: "Calendar",
      description:
        "Track your time and goals in a calendar view. Add events to your calendar to stay on top of your schedule.",
      image: staticUrl + "/pointron/landing/quickfocus.gif"
    },
    {
      title: "Focus goals and tasks",
      description:
        "You can work on single or multiple goals in a focus session. What's more? You can also work on tasks and add task estimations.",
      image: staticUrl + "/pointron/landing/custom.gif"
    },
    {
      title: "Analytics",
      description:
        "When its time, make thoughtful decisions or track the progress of your goals and sub goals using powerful analytics.",
      image: staticUrl + "/pointron/landing/analytics.gif"
    },
    {
      title: "Perosnalize it your way",
      description:
        "Pointron doesn’t just help you manage time it adapts to you. Personalize your productivity experience with a variety of color schemes that cater to your taste.",
      image: staticUrl + "/pointron/landing/personalization.gif"
    }
  ];
</script>

<HeroSection {heroInputs} />
<!-- <HeroVideo
  videoUrl="https://youtu.be/CguXo8YQnm4"
  thumbnailUrl="https://img.youtube.com/vi/CguXo8YQnm4/maxresdefault.jpg"
/> -->
<IrregularTileItemsSection
  items={features}
  title="Navigating your productivity"
/>
<!-- <span
  class="flex text-h3 text-aps1 w-full h-full bg-bgs1 justify-center items-center"
>
  Pointron
</span> -->
