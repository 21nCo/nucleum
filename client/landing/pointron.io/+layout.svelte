<script lang="ts">
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";

  let topNavBarValues: any = {
    icon: "pointron",
    title: "Pointron",
    items: [
      { label: "Discord", href: "https://discord.gg/blanklabs" },
      { label: "Roadmap", href: "/blog" },
      { label: "Pricing", href: "/pricing" }
    ],
    cta: {
      label: "Access Web",
      href: "https://app.pointron.io"
    }
  };
</script>

<BlankLandingLayout {topNavBarValues} isProduct={true}>
  <slot />
</BlankLandingLayout>
