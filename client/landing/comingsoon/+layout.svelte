<script lang="ts">
  import BlankLandingLayout from "$lib/client/landing/shared/BlankLandingLayout.svelte";
  import CommingSoonSection from "../shared/CommingSoonSection.svelte";
  import { extractProductv1 } from "$lib/shared/utils/utils";
  import { upcomingProductsStore } from "../shared/store/shared.store";

  let commingSoonSectionInputs: any;
  let topNavBarValues: any;
  const { product } = extractProductv1(window.location.host);
  let i = $upcomingProductsStore.findIndex(
    (x) => x.title.toLocaleLowerCase() === product
  );

  i = 0; //temp remove once before pushing coming soon to live
  commingSoonSectionInputs = $upcomingProductsStore[i];
  topNavBarValues = {
    icon: $upcomingProductsStore[i].icon,
    title: $upcomingProductsStore[i].title,
    items: [{ label: "Discord", href: "https://discord.gg/blanklabs" }]
  };
  console.log("commingSoonSectionInputs", commingSoonSectionInputs);
</script>

<BlankLandingLayout {topNavBarValues} isComingSoon={true}>
  <CommingSoonSection {commingSoonSectionInputs} />
</BlankLandingLayout>
