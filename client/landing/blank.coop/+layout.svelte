<script lang="ts">
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";

  const topNavBarValues = {
    title: "Blank.coop",
    icon: "blank-coop",
    items: [{ label: "Dicord", href: "https://discord.gg/kBdqn5hD" }]
  };
</script>

<BlankLandingLayout {topNavBarValues} isProductsPage={false}>
  <slot />
</BlankLandingLayout>
