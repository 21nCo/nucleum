<script lang="ts">
  import { upcomingProductsStore } from "../shared/store/shared.store";
  import HeroSection from "../shared/HeroSection.svelte";
  import HeroVideo from "../shared/elements/HeroVideo.svelte";
  import type { IHeroInputs, ITileItem } from "../shared/Landing.types";
  import IrregularTileItemsSection from "../shared/tile/IrregularTileItemsSection.svelte";

  let heroData: any;
  heroData = {
    tagline: "Your memory atlas.",
    description:
      "Memotron is a digital memory and thinking tool that is unbelievably powerful, insanely reliable, and surprisingly intuitive. Transform the way you learn, think and create.",
    href: "https://memotron.app",
    earlyAccessUrl: "https://tally.so/r/3qB0x9"
  };

  let heroInputs: IHeroInputs = {
    tagline: "Your memory atlas.",
    description:
      "Memotron is a digital memory and thinking tool that is unbelievably powerful, insanely reliable, and surprisingly intuitive. Transform the way you learn, think and create.",
    btn1: {
      label: "Download mobile app",
      iosDownloadUrl:
        "https://apps.apple.com/in/app/memotron-your-memory-atlas/id6737236940",
      androidDownloadUrl:
        "https://play.google.com/store/apps/details?id=io.memotron.app.twa"
    },
    btn2: {
      label: "Get started",
      icon: "arrow-NW",
      macDownloadUrl: "https://web.memotron.app",
      windowsDownloadUrl: "https://web.memotron.app"
    }
  };

  const baseUrl = import.meta.env.VITE_STATIC_URL + "/images/memotron/";
  const videoId = import.meta.env.VITE_YOUTUBE_VIDEO_ID ?? "SeWdndc7y4A";

  let features: ITileItem[] = [
    {
      title: "Powerful ways to capture",
      description:
        "Seamlessly capture in any format and from any device. Markdown, transcription, annotations and more",

      image: baseUrl + "landing/capture.png"
    },

    {
      title: "Collections",
      description:
        "Curate anything and organize your memories, notes, thoughts, bookmarks like a breeze",
      image: baseUrl + "landing/collections.png"
    },
    {
      title: "Link to curate",
      description:
        "Use our ingenius link to curate feature to curate while capturing or clipping making information instantly useful",
      image: baseUrl + "landing/linktocurate.png"
    },
    {
      title: "Clipping to the rescue",
      description:
        "Clip anything like web pages, text highlights, Youtube video, tweets and so much more",
      image: baseUrl + "landing/clipping.png"
    },
    {
      title: "Blazingly fast search",
      description:
        "Search through your memories and notes with our blazingly fast search engine. Use Semantic search if you can't find what you are looking for",
      image: baseUrl + "landing/search.png"
    },
    {
      title: "Perosnalize it your way",
      description:
        "Memotron doesn’t just help you manage your memory it adapts to you. Personalize your experience with a variety of color schemes that cater to your taste.",
      image: baseUrl + "landing/personalization.png"
    }
  ];
</script>

<HeroSection {heroInputs} />
<HeroVideo
  videoUrl="https://www.youtube.com/embed/{videoId}?autoplay=1&mute=1"
  thumbnailUrl="https://img.youtube.com/vi/{videoId}/maxresdefault.jpg"
/>
<div class="w-full h-[300px]"></div>
<IrregularTileItemsSection items={features} title="Navigating your memory" />
