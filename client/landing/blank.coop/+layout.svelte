<script lang="ts">
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";

  const topNavBarValues = {
    icon: "21n-temp",
    items: [
      { label: "Discord", href: "https://discord.com/invite/9HJqKYTZKg" },
      { label: "White paper", href: "https://papers.21n.io/soft" }
    ]
  };
</script>

<BlankLandingLayout {topNavBarValues}>
  <slot />
</BlankLandingLayout>
