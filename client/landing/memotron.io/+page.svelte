<script lang="ts">
  import CommingSoonSection from "../shared/CommingSoonSection.svelte";
  import { extractProductv1 } from "$lib/shared/utils/utils";
  import { upcomingProductsStore } from "../shared/store/shared.store";

  let commingSoonSectionInputs: any;
  const { product } = extractProductv1(window.location.host);
  let i = $upcomingProductsStore.findIndex(
    (x) => x.title.toLocaleLowerCase() === product
  );
  commingSoonSectionInputs = {
    image: "memotron-product-image",
    title: "Memotron",
    label: "Personal knowledge management redefined",
    href: "https://memotron.io"
  };
</script>

<CommingSoonSection {commingSoonSectionInputs} />
