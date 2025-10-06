<script lang="ts">
  import "$lib/client/app.css";
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";
  import type {
    IFooter,
    ILandingProductUrls,
    ITopNavBar
  } from "../shared/landing.type";
  import type { IMetadata } from "$lib/client/layout/metadata.type";
  import { org, landing } from "../shared/store/shared.store";

  const urls: ILandingProductUrls = {
    web: "https://web.pointron.app",
    features: "https://docs.pointron.app/pointron/features",
    tutorials: org.youtube,
    faqs: "https://docs.pointron.app/pointron/faqs",
    changelog: "https://docs.pointron.app/changelog/pointron/new",
    roadmap: "https://docs.pointron.app/pointron/roadmap",
    downloads: {
      all: "https://docs.pointron.app/pointron/installation",
      ios: "https://apps.apple.com/in/app/pointron-focus-time-tracker/id6469411284"
    },
    socials: {
      twitter: "https://x.com/pointronApp"
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
      { label: "Discord", href: org.discord }
    ],
    cta: [
      {
        label: "",
        href: "https://github.com/21nOrg/tidigit",
        icon: "github-logo",
        type: "secondary"
      },
      {
        label: "Go to web app",
        href: "https://web.pointron.app",
        type: "primary"
      }
    ]
  };
  let footerValues: IFooter = {
    appStoreUrl: urls.downloads?.ios,
    twitterUrl: urls.socials?.twitter,
    docsUrl: "https://docs.pointron.app",
    youtubeUrl: org.youtube,
    roadmapUrl: urls.roadmap,
    changelogUrl: urls.changelog
  };
  let metadata: IMetadata = {
    title: "Pointron - Open source wholesome time tracker for everyone",
    description:
      "Pointron is a focus time tracker that helps you stay focused and productive.",
    keywords: "pointron, focus, time, tracker, productivity",
    url: "https://pointron.app",
    image: "https://cdn.21n.co/pointron/ogImage.png"
  };
  landing.load(urls);
</script>

<BlankLandingLayout {topNavBarValues} {footerValues} isProduct={true}>
  <slot />
</BlankLandingLayout>
