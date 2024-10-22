<script lang="ts">
  import CommingSoonSection from "../shared/CommingSoonSection.svelte";
  import { extractProductv1 } from "$lib/shared/utils/utils";
  import { upcomingProductsStore } from "../shared/store/shared.store";
  import HeroSection from "../shared/HeroSection.svelte";

  let heroData: any;
  const { product } = extractProductv1(window.location.host);
  let i = $upcomingProductsStore.findIndex(
    (x) => x.title.toLocaleLowerCase() === product
  );
  heroData = {
    tagline: "Your memory atlas.",
    description:
      "Memotron is a digital memory and thinking tool that is unbelievably powerful, insanely reliable, and surprisingly intuitive. Transform the way you learn, think and create.",
    href: "https://memotron.io",
    earlyAccessUrl: "https://tally.so/r/3qB0x9"
  };
</script>

<HeroSection isComingSoon={true} heroInputs={heroData} />
