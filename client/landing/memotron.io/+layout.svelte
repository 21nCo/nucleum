<script lang="ts">
  import BlankLandingLayout from "../shared/BlankLandingLayout.svelte";
  import type { IFooter } from "../shared/Landing.types";
  let topNavBarValues: any = {
    icon: "memotron",
    title: "Memotron",
    items: [
      {
        label: "Downloads",
        href: "https://docs.memotron.app/memotron/installation"
      },
      { label: "Discord", href: "https://discord.com/invite/9HJqKYTZKg" },
      { label: "Pricing", href: "/pricing" }
    ],
    cta: {
      label: "Access Web",
      href: "https://web.memotron.app"
    }
  };
  let footerValues: IFooter = {
    appStoreUrl:
      "https://apps.apple.com/in/app/memotron-your-memory-atlas/id6737236940",
    twitterUrl: "https://x.com/memotronApp",
    docsUrl: "https://docs.memotron.app",
    youtubeUrl: "https://www.youtube.com/@21nOrg",
    roadmapUrl: "https://docs.memotron.app/memotron/roadmap",
    changelogUrl: "https://docs.memotron.app/changelog/memotron/new"
  };
</script>

<BlankLandingLayout {topNavBarValues} {footerValues} isProduct={true}>
  <slot />
</BlankLandingLayout>
