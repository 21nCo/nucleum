<script lang="ts">
  import "$lib/client/app.css";
  import BlankLandingLayout from "../shared/BlankLandingLayout.svelte";
  import type {
    IFooter,
    ILandingProductUrls,
    ITopNavBar
  } from "../shared/landing.type";
  import { landing, org } from "../shared/store/shared.store";

  const urls: ILandingProductUrls = {
    web: "https://web.memotron.app",
    features: "https://docs.memotron.app/memotron/features",
    tutorials: org.youtube,
    faqs: "https://docs.memotron.app/memotron/faqs",
    changelog: "https://docs.memotron.app/changelog/memotron/new",
    roadmap: "https://docs.memotron.app/memotron/roadmap",
    downloads: {
      all: "https://docs.memotron.app/memotron/installation",
      ios: "https://apps.apple.com/in/app/memotron-your-memory-atlas/id6737236940",
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
      { label: "Compare", href: "compare" },
      { label: "Extension", href: urls.downloads?.extension ?? "" },
      { label: "Discord", href: org.discord }
    ],
    cta: [
      {
        label: "",
        href: "https://github.com/21nOrg/nucleus",
        icon: "ph:github-logo",
        type: "secondary"
      },
      {
        label: "Go to web app",
        href: "https://web.memotron.app",
        type: "primary"
      }
    ]
  };
  let footerValues: IFooter = {
    appStoreUrl: urls.downloads?.ios,
    twitterUrl: urls.socials?.twitter,
    docsUrl: "https://docs.memotron.app",
    youtubeUrl: org.youtube,
    roadmapUrl: urls.roadmap,
    changelogUrl: urls.changelog
  };
  landing.load(urls);
</script>

<BlankLandingLayout {topNavBarValues} {footerValues} isProduct={true}>
  <slot />
</BlankLandingLayout>
