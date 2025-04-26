<script lang="ts">
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import type { IFooter } from "../shared/Landing.types";
  import type { IMetadata } from "$lib/client/layout/metadata.type";
  let topNavBarValues: any = {
    icon: "pointron",
    title: "Pointron",
    items: [
      { label: "Pricing", href: "/pricing" },
      {
        label: "Docs",
        href: "https://docs.pointron.app/"
      },
      { label: "Discord", href: "https://discord.com/invite/9HJqKYTZKg" }
    ],
    cta: {
      label: "Go to web app",
      href: "https://web.pointron.app"
    }
  };
  let footerValues: IFooter = {
    appStoreUrl:
      "https://apps.apple.com/in/app/pointron-focus-time-tracker/id6469411284",
    twitterUrl: "https://x.com/pointronApp",
    docsUrl: "https://docs.pointron.app",
    youtubeUrl: "https://www.youtube.com/@21nOrg",
    roadmapUrl: "https://docs.pointron.app/pointron/roadmap",
    changelogUrl: "https://docs.pointron.app/changelog/pointron/new"
  };
  let metadata: IMetadata = {
    title: "Pointron",
    description:
      "Pointron is a focus time tracker that helps you stay focused and productive.",
    keywords: "pointron, focus, time, tracker, productivity",
    url: "https://pointron.app"
  };
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
