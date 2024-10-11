<script lang="ts">
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";

  const topNavBarValues = {
    icon: "21n-temp",
    items: [
      { label: "Discord", href: "https://discord.gg/kBdqn5hD" },
      { label: "White paper", href: "https://docs.blanklabs.org/soft" }
    ]
  };
</script>

<BlankLandingLayout {topNavBarValues}>
  <slot />
</BlankLandingLayout>
