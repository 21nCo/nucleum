<script lang="ts">
  import CommingSoonSection from "../shared/CommingSoonSection.svelte";
  import { extractProductv1 } from "$lib/shared/utils/utils";
  import { upcomingProductsStore } from "../shared/store/shared.store";
  import HeroSection from "../shared/HeroSection.svelte";
  import HeroVideo from "../shared/elements/HeroVideo.svelte";
  import type { IHeroInputs, ITileItem } from "../shared/Landing.types";
  import IrregularTileItemsSection from "../shared/tile/IrregularTileItemsSection.svelte";

  let heroData: any;
  const { product } = extractProductv1(window.location.host);
  let i = $upcomingProductsStore.findIndex(
    (x) => x.title.toLocaleLowerCase() === product
  );
  heroData = {
    tagline: "Your memory atlas.",
    description:
      "Memotron is a digital memory and thinking tool that is unbelievably powerful, insanely reliable, and surprisingly intuitive. Transform the way you learn, think and create.",
    href: "https://memotron.io",
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
        "https://apps.apple.com/in/app/memotron-your-memory-atlas/id6737236940"
    },
    btn2: {
      label: "Get started",
      icon: "arrow-NW",
      macDownloadUrl: "https://app.memotron.io",
      windowsDownloadUrl: "https://app.memotron.io"
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
<IrregularTileItemsSection items={features} title="Navigating your memory" />
