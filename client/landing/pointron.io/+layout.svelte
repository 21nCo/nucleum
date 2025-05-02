<script lang="ts">
  import "$lib/client/app.css";
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";
  import type {
    IFooter,
    ILandingProductUrls,
    ITopNavBar
  } from "../shared/landing.type";
  import type { IMetadata } from "$lib/client/layout/metadata.type";
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
      ios: "https://apps.apple.com/in/app/pointron-focus-time-tracker/id6469411284"
    }
  };
  let topNavBarValues: ITopNavBar = {
    icon: "pointron",
    title: "Pointron",
    items: [
      {
        label: "Resources",
        href: "https://docs.pointron.app/",
        expandRender: "resources"
      },
      // { label: "Compare", href: "/compare", expandRender: "compare" },
      { label: "Pricing", href: "pricing" },
      { label: "Discord", href: discordUrl }
    ],
    cta: {
      label: "Go to web app",
      href: "https://web.pointron.app",
      type: "primary"
    }
  };
  let footerValues: IFooter = {
    appStoreUrl:
      "https://apps.apple.com/in/app/pointron-focus-time-tracker/id6469411284",
    twitterUrl: "https://x.com/pointronApp",
    docsUrl: "https://docs.pointron.app",
    youtubeUrl: youtubeUrl,
    roadmapUrl: urls.roadmap,
    changelogUrl: urls.changelog
  };
  let metadata: IMetadata = {
    title: "Pointron",
    description:
      "Pointron is a focus time tracker that helps you stay focused and productive.",
    keywords: "pointron, focus, time, tracker, productivity",
    url: "https://pointron.app"
  };
  landing.load(urls);
</script>

<!-- {#if import.meta.env.DEV}
  <div class="fixed bottom-0 right-0 bg-bgs1 text-fgs1 p-2 text-xs z-50">
    Theme: {$appearance.theme}<br />
    Color Scheme: {$appearance.colorScheme?.id}<br />
    Tailwind Selector: {$appearance.colorScheme?.tailwindSelector}
  </div>
{/if} -->

<BlankLandingLayout
  {topNavBarValues}
  {footerValues}
  isProduct={true}
  {metadata}
>
  <slot />
</BlankLandingLayout>
