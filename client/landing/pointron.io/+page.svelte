<script lang="ts">
  import BottomCta from "../shared/bottomCta/BottomCta.svelte";
  import HeroVideo from "../shared/elements/HeroVideo.svelte";
  import FeaturesExample from "../shared/features/FeaturesExample.svelte";
  import HeroSection from "../shared/HeroSection.svelte";
  import Highlights from "../shared/highlights/Highlights.svelte";
  import type {
    IHeroInputs,
    IHighlight,
    ITestimonial,
    ITileItem
  } from "../shared/landing.type";
  import Testimonials from "../shared/testimonials/Testimonials.svelte";
  import { landing } from "../shared/store/shared.store";
  import HeroVideoV2 from "../shared/elements/HeroVideoV2.svelte";
  let heroInputs: IHeroInputs = {
    tagline: "Your focus haven",
    description: "Track time, achieve goals and focus like never before.",
    primaryButton: {
      isDownloadButton: true,
      type: "primary"
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

  const highlights: IHighlight[] = [
    {
      icon: "powerfulwheel",
      title: "Unbelievably powerful",
      desc: "Unlock next-level productivity with a powerhouse of features designed to get things done",
      visualRenderComponent: "CollectionsGraph"
    },
    // {
    //   icon: "brain",
    //   title: "AI native",
    //   desc: "Seamlessly integrate your data and harness cutting-edge AI with our custom MCP server",
    //   visualRenderComponent: "ainative",
    //   isVisualAtBottom: true
    // },
    {
      icon: "offline",
      title: "Offline",
      desc: "No cloud required. If your OS runs, so does this",
      visualRenderComponent: "NetworkIcon",
      isVisualAtBottom: true
    },
    // {
    //   icon: "zerotrust",
    //   title: "Zero-trust security & ownership",
    //   desc: "If you opt for managed cloud sync, your data is encrypted from start to finish - only you can access it. Even better, you can host your data on your preferred servers or run locally.",
    //   visualRenderComponent: "security",
    //   isVisualAtBottom: true
    // },
    {
      icon: "infinity",
      title: "Built to last",
      desc: "No exits. No acquisitions. We're not building for an exit. We're building for you",
      visualRenderComponent: "last"
    },
    {
      icon: "touch",
      title: "Surprisingly intuitive",
      desc: "A clean, elegant interface that makes powerful features feel effortless",
      visualRenderComponent: "UIVisual",
      isVisualAtBottom: true
    }
  ];

  const testimonials: ITestimonial[] = [
    {
      name: "TheoxPratham",
      body: "Loved the concept and the work that has been put in it to make it the best focus app.",
      source: "App store"
    },
    {
      name: "Artak",
      body: "I absolutely love it and use it everyday.",
      source: "Discord"
    },
    {
      name: "VirgilCaffier",
      body: "Your time is precious! What's the best way to not waste it? The one I'm currently using is Pointron!",
      source: "X",
      link: "https://x.com/VirgilCaffier/status/1661031751387602946"
    },
    {
      name: "NellyisDev",
      body: "I really love the app.",
      source: "Discord"
    }
  ];

  const deviceImages = [
    // staticUrl + "/pointron/bottomCta/tab.png",
    // staticUrl + "/pointron/bottomCta/laptop.png",
    // staticUrl + "/pointron/bottomCta/phone.png",
    "tab.png",
    "laptop.png",
    "phone.png"
  ];
</script>

<HeroSection {heroInputs} />
<!-- <HeroVideo
  videoUrl="https://www.youtube.com/embed/SeWdndc7y4A?si=xnr1BZSPhT5dAybc"
/> -->
<HeroVideoV2
  url="https://www.youtube.com/embed/SeWdndc7y4A?si=xnr1BZSPhT5dAybc"
  {deviceImages}
/>
<Highlights {highlights} />
<FeaturesExample />
<Testimonials
  {testimonials}
  title="Join the community"
  subtitle="Discover what our community has to say about their Pointron experience."
/>
<BottomCta
  {deviceImages}
  body="Start using Pointron to simplify time tracking and take control of your productivity journey. Empower yourself to work smarter, not harder"
  primaryAction={{ isDownloadButton: true, type: "primary" }}
  secondaryAction={{
    label: "See all downloads",
    icon: "arrowright",
    href: $landing.urls.downloads?.all,
    type: "secondary"
  }}
/>
