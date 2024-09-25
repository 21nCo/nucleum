<script lang="ts">
  import BlankLandingLayout from "../shared/BlankLandingLayout.svelte";
  let topNavBarValues = {
    icon: "memotron",
    title: "Memotron",
    items: [{ label: "Discord", href: "https://discord.gg/blanklabs" }]
  };
</script>

<BlankLandingLayout {topNavBarValues}>
  <slot />
</BlankLandingLayout>
