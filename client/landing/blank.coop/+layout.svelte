<script lang="ts">
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";
  import type { IFooter } from "../shared/Landing.types";

  const topNavBarValues = {
    icon: "21n-temp",
    items: [
      { label: "Discord", href: "https://discord.com/invite/9HJqKYTZKg" },
      { label: "White paper", href: "https://papers.21n.io/soft" }
    ]
  };
  let footerValues: IFooter = {
    youtubeUrl: "https://www.youtube.com/@21nCompany"
  };
</script>

<BlankLandingLayout {topNavBarValues} {footerValues}>
  <slot />
</BlankLandingLayout>
