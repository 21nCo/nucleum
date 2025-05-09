<script lang="ts">
  import "$lib/client/app.css";
  import type { IMetadata } from "$lib/client/layout/metadata.type";
  import BlankLandingLayout from "../shared/BlankLandingLayout.svelte";
  import type {
    IFooter,
    ILandingProductUrls,
    ITopNavBar
  } from "../shared/landing.type";
  import {
    discordUrl,
    landing,
    youtubeUrl
  } from "../shared/store/shared.store";

  const urls: ILandingProductUrls = {
    web: "https://web.pointron.app",
    features: "https://docs.pointron.app/pointron/features",
    tutorials: youtubeUrl,
    faqs: "https://docs.pointron.app/pointron/faqs",
    changelog: "https://docs.pointron.app/changelog/pointron/new",
    roadmap: "https://docs.pointron.app/pointron/roadmap",
    downloads: {
      all: "https://docs.pointron.app/pointron/installation",
      ios: "https://apps.apple.com/in/app/pointron-focus-time-tracker/id6469411284",
      extension:
        "https://chromewebstore.google.com/detail/memotron-web-clipper/fgghopffkfdhckbcghodnlbplkagokcn"
    },
    socials: {
      twitter: "https://x.com/memotronApp",
      reddit: "https://www.reddit.com/r/memotron/"
    }
  };

  let topNavBarValues: ITopNavBar = {
    icon: "memotron",
    title: "Memotron",
    items: [
      {
        label: "Resources",
        href: "https://docs.memotron.app/",
        expandRender: "resources"
      },
      { label: "Pricing", href: "pricing" },
      { label: "Extension", href: urls.downloads?.extension ?? "" },
      { label: "Discord", href: discordUrl }
    ],
    cta: {
      label: "Go to web app",
      href: "https://web.memotron.app",
      type: "primary"
    }
  };
  let footerValues: IFooter = {
    appStoreUrl:
      "https://apps.apple.com/in/app/memotron-your-memory-atlas/id6737236940",
    twitterUrl: urls.socials?.twitter,
    docsUrl: "https://docs.memotron.app",
    youtubeUrl: youtubeUrl,
    roadmapUrl: urls.roadmap,
    changelogUrl: urls.changelog
  };
  let metadata: IMetadata = {
    title: "Memotron",
    description:
      "Memotron is a memory atlas that helps you remember everything.",
    keywords: "memotron, memory, atlas, remember",
    url: "https://memotron.app"
  };
  landing.load(urls);
</script>

<BlankLandingLayout
  {topNavBarValues}
  {footerValues}
  isProduct={true}
  {metadata}
>
  <slot />
</BlankLandingLayout>
