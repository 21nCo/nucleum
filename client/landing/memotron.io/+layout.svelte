<script lang="ts">
  import BlankLandingLayout from "../shared/BlankLandingLayout.svelte";
  import type { IFooter } from "../shared/Landing.types";
  let topNavBarValues: any = {
    icon: "memotron",
    title: "Memotron",
    items: [
      {
        label: "Downloads",
        href: "https://docs.memotron.io/docs/getting-started/installation"
      },
      { label: "Discord", href: "https://discord.com/invite/9HJqKYTZKg" },
      { label: "Pricing", href: "/pricing" }
    ],
    cta: {
      label: "Access Web",
      href: "https://app.memotron.io"
    }
  };
  let footerValues: IFooter = {
    appStoreUrl:
      "https://apps.apple.com/in/app/memotron-your-memory-atlas/id6737236940",
    twitterUrl: "https://x.com/memotronApp",
    docsUrl: "https://docs.memotron.io",
    youtubeUrl: "https://www.youtube.com/@21nOrg",
    roadmapUrl: "https://docs.memotron.io/docs/more/roadmap",
    changelogUrl: "https://memotron.supahub.com/changelog"
  };
</script>

<BlankLandingLayout {topNavBarValues} {footerValues} isProduct={true}>
  <slot />
</BlankLandingLayout>
