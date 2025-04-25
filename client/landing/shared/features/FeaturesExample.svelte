<script lang="ts">
  import Features from "./Features.svelte";
  import type { IFeature } from "../Landing.types";

  const features: IFeature[] = [
    {
      feature: "Focus",
      title: "Focus",
      desc: "Focus",
      visualRenderComponent: "Focus"
    }
  ];
</script>

<Features
  {features}
  title="Explore focus in a whole new way"
  subtitle="One feature at a time"
/>
