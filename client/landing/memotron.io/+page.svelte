<script lang="ts">
  import BottomCta from "../shared/bottomCta/BottomCta.svelte";
  import HeroSection from "../shared/HeroSection.svelte";
  import Highlights from "../shared/highlights/Highlights.svelte";
  import type {
    IFeature,
    IHeroInputs,
    IHighlight,
    ITestimonial
  } from "../shared/landing.type";
  import Testimonials from "../shared/testimonials/Testimonials.svelte";
  import { landing, staticUrl } from "../shared/store/shared.store";
  import HeroVideoV2 from "../shared/elements/HeroVideoV2.svelte";
  import Features from "../shared/features/Features.svelte";
  import { highlights } from "../shared/highlights/highlights.data";
  let heroInputs: IHeroInputs = {
    tagline: "Your memory atlas",
    description:
      "Transform the way you think, learn and manage your knowledge.",
    primaryButton: {
      isDownloadButton: true,
      type: "primary"
    },
    availabilityString:
      "Available as web, chrome extension, iOS and macOS apps."
  };
  const heroVideoFrameUrl =
    staticUrl + "/images/landing/videoFrames/Frame-5.png";

  const memotronHighlights: IHighlight[] = [
    {
      ...highlights.wholesome,
      desc: "Finally, a place where everything personal knowledge management feels coherent.",
      visualRenderComponent: "memotronFeaturesRadial"
    },
    {
      ...highlights.powerful,
      desc: "Unlock next-level of your digital memory with a powerhouse of features.",
      visualRenderComponent: ""
    },
    highlights.intuitive,
    // highlights.zerotrust,
    // highlights.ainative,
    highlights.offline,
    highlights.laast,
    highlights.reliable
  ];
  const mainMemotronVideoUrl = "https://www.youtube.com/watch?v=SeWdndc7y4A";
  const testimonials: ITestimonial[] = [
    {
      name: "CRWM_",
      body: "Wow this sounds super interesting! I like your premise of NCCL it aligns with my goal of what I've been trying to accomplish with testing out various PKMS apps!",
      source: "reddit",
      link: "https://www.reddit.com/r/PKMS/comments/1gov3mq/comment/lwljjqy/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button"
    },
    {
      name: "Raju Penmatsa",
      body: "just came across Memotron (notion alt),  on my yt feed, this is really incredible. connectors could be game changer, especially for my workflows. I really lack a good funnel, which can capture. ",
      source: "twitter",
      link: "https://x.com/iam_rajuptvs/status/1857100041795887608"
    },
    {
      name: "@iamjesushusbands",
      body: "This actually really peaks my interest and I'm a hardcore Notion user",
      source: "youtube",
      link: mainMemotronVideoUrl
    },
    {
      name: "@Yash_Tomar",
      body: "Impressive",
      source: "youtube",
      link: mainMemotronVideoUrl
    },
    {
      name: "@MyDigitalHub",
      body: "Tried using it for 2 days now. Very interesting approach in PKM.",
      source: "youtube",
      link: mainMemotronVideoUrl
    },
    {
      name: "Antone",
      body: "I like the idea of this app and think it can have a great future.",
      source: "youtube",
      link: "https://youtu.be/SmUIsnbahbE?si=TXEQkJGNb2jbiVGu"
    },
    {
      name: "Arka9",
      body: "I really like the concept behind Memotron it's got a lot of potential!",
      source: "discord",
      link: "https://discord.com/channels/831815510563749889/1306169287479922688"
    },
    {
      name: "@elephant999",
      body: "I really like this app",
      source: "youtube",
      link: "https://www.youtube.com/watch?v=SdDRE53zLiM"
    },
    {
      name: "Fylleth666",
      body: "Well the video is mindblowing, excited to test yet another very promising PKM!",
      source: "reddit",
      link: "https://www.reddit.com/r/PKMS/comments/1gov3mq/comment/lwn4xeb/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button"
    },
    {
      name: "BlaqueServant",
      body: "OK, you have my attention with this. I wish it were a bit prettier and flashier, but the functionality seems impressive off the bat.",
      source: "reddit",
      link: "https://www.reddit.com/r/PKMS/comments/1gov3mq/comment/lwyeu9o/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button"
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
      image: "captureFeature.png",
      feature: "Seamless capture",
      title: "Capturing at its finest",
      desc: "Capture in any format and from any device with our seamless capture experience.",
      visualRenderComponent: "captureFeature"
    },
    {
      image: "clipFeature.png",
      feature: "Most intuitive clipping",
      title: "Clip anything, anywhere",
      desc: "Clip anything, anywhere with the most intuitive clipping experience using our chrome extension.",
      visualRenderComponent: "clipFeature"
    },
    {
      image: "organizeFeature.png",
      feature: "Organize",
      title: "Organize your knowledge in a breeze",
      desc: "Organize your knowledge in a breeze with collections.",
      visualRenderComponent: "organizeFeature"
    },
    {
      image: "synthesizeFeature.png",
      feature: "Synthesize",
      title: "Synthesize your knowledge",
      desc: "Synthesize your knowledge with the most intuitive synthesizing experience.",
      visualRenderComponent: "synthesizeFeature"
    }
  ];
</script>

<HeroSection {heroInputs} />
<HeroVideoV2
  url="https://www.youtube.com/embed/SeWdndc7y4A?si=Wa0Kdg22N205iOLJ"
  {deviceImages}
  frameImage={heroVideoFrameUrl}
/>
<Highlights
  highlights={memotronHighlights}
  title="Exceptional throughout"
  subtitle="From interface to infrastructure, user need alignment is at the core of our approach"
/>
<Features
  {features}
  title="Explore PKM in a whole new way"
  subtitle="Thoughtfully crafted, one feature at a time"
/>
<Testimonials
  {testimonials}
  title="Join the community"
  subtitle="Discover what our community has to say about their Memotron experience."
/>
<BottomCta
  {deviceImages}
  body="Start using Memotron to simplify your knowledge management and take control of your learning journey. Empower yourself to think better, not harder"
  primaryAction={{ isDownloadButton: true, type: "primary" }}
  secondaryAction={{
    label: "See all downloads",
    icon: "arrowright",
    href: $landing.urls.downloads?.all,
    type: "secondary"
  }}
/>
