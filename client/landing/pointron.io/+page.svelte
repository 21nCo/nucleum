<script lang="ts">
  import BottomCta from "@21n/landing/shared/bottomCta/BottomCta.svelte";
  import HeroSection from "@21n/landing/shared/HeroSection.svelte";
  import Highlights from "@21n/landing/shared/highlights/Highlights.svelte";
  import type {
    IFeature,
    IHeroInputs,
    IHighlight,
    ITestimonial,
    ITileItem
  } from "@21n/landing/shared/landing.type";
  import Testimonials from "@21n/landing/shared/testimonials/Testimonials.svelte";
  import { landing, staticUrl } from "@21n/landing/shared/store/shared.store";
  import HeroVideoV2 from "@21n/landing/shared/elements/HeroVideoV2.svelte";
  import Features from "@21n/landing/shared/features/Features.svelte";
  import { highlights } from "@21n/landing/shared/highlights/highlights.data";
  let heroInputs: IHeroInputs = {
    tagline: "Your focus haven",
    description: "Track time, achieve goals and focus like never before.",
    primaryButton: {
      isDownloadButton: true,
      type: "primary"
    },
    availabilityString: "Available on web, iOS and macOS."
  };

  const heroVideoFrameUrl =
    staticUrl + "/images/landing/videoFrames/Frame-10.png";

  let featuresOld: ITileItem[] = [
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

  const pointronHighlights: IHighlight[] = [
    {
      ...highlights.wholesome,
      desc: "Finally, a place where personal focus management feels complete.",
      visualRenderComponent: "pointronFeatures"
    },
    // highlights.reliable,
    {
      ...highlights.powerful,
      desc: "Unlock next-level of focus, time and goal tracking with a powerhouse of features.",
      visualRenderComponent: ""
    },
    highlights.offline,
    highlights.zerotrust,
    highlights.laast,
    highlights.intuitive
  ];

  const testimonials: ITestimonial[] = [
    {
      name: "TheoxPratham",
      body: "Loved the concept and the work that has been put in it to make it the best focus app.",
      source: "appstore",
      link: "https://apps.apple.com/in/app/pointron-focus-time-tracker/id6469411284?platform=iphone"
    },
    {
      name: "Artak",
      body: "I absolutely love it and use it everyday.",
      source: "discord"
    },
    {
      name: "NellyisDev",
      body: "Pointron is a great app that helps me track my day, understand how I spend my time, and plan to be more efficient so I get more done, faster.",
      source: "discord"
    },
    {
      name: "VirgilCaffier",
      body: "Your time is precious! What's the best way to not waste it? The one I'm currently using is Pointron!",
      source: "twitter",
      link: "https://x.com/VirgilCaffier/status/1661031751387602946"
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

  const features: IFeature[] = [
    {
      image: "phone.png",
      feature: "Advanced focus",
      title: "Focus in more powerful ways",
      desc: "Focus the way you work with customisable focus sessions and break reminders.",
      visualRenderComponent: "focusFeature"
    },
    {
      image: "goalsFeature.png",
      feature: "Goals & Tasks",
      title: "Infinite goal nesting, tasks at atomic level",
      desc: "Create and track goals granularly using deep nesting and create tasks on atomic level.",
      visualRenderComponent: "goalsFeature"
    },
    {
      image: "analyticsFeature.png",
      feature: "Calendar, Analytics & more",
      title: "Powerhouse of features",
      desc: "Track your progress using Analytics, calendar and more.",
      visualRenderComponent: "analyticsFeature"
      // tutorialUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    }
  ];
</script>

<HeroSection {heroInputs} />
<!-- <HeroVideo
  videoUrl="https://www.youtube.com/embed/SeWdndc7y4A?si=xnr1BZSPhT5dAybc"
/> -->
<HeroVideoV2
  url="https://www.youtube.com/embed/5lnABLu3YXs?si=u1iuwtfGYBWLraqP"
  {deviceImages}
  frameImage={heroVideoFrameUrl}
/>
<Highlights
  highlights={pointronHighlights}
  title="Exceptional throughout"
  subtitle="From interface to infrastructure, user need alignment is at the core of our approach"
/>
<Features
  {features}
  title="Explore focus in a whole new way"
  subtitle="Thoughtfully crafted, one feature at a time"
/>
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
