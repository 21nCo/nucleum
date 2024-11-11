<script lang="ts">
  import BlankLandingLayout from "../shared/BlankLandingLayout.svelte";
  import type { IFooter } from "../shared/Landing.types";
  let topNavBarValues: any = {
    icon: "memotron",
    title: "Memotron",
    items: [
      { label: "Discord", href: "https://discord.gg/blanklabs" },
      { label: "Pricing", href: "/pricing" }
    ],
    cta: {
      label: "Access Web",
      href: "https://app.pointron.io"
    }
  };
  let footerValues: IFooter = {
    appStoreUrl:
      "https://apps.apple.com/in/app/memotron-your-memory-atlas/id6737236940",
    twitterUrl: "https://x.com/memotronIO",
    docsUrl: "https://docs.memotron.io",
    youtubeUrl: "https://www.youtube.com/@memotronio",
    roadmapUrl: "https://memotron.supahub.com/roadmap",
    changelogUrl: "https://memotron.supahub.com/changelog"
  };
</script>

<BlankLandingLayout {topNavBarValues} {footerValues} isProduct={true}>
  <slot />
</BlankLandingLayout>
