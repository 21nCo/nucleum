<script lang="ts">
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";

  let topNavBarValues: any = {
    icon: "memotron",
    title: "Memotron",
    items: [{ label: "Discord", href: "https://discord.gg/blanklabs" }]
  };
</script>

<BlankLandingLayout {topNavBarValues}>
  <slot />
</BlankLandingLayout>
