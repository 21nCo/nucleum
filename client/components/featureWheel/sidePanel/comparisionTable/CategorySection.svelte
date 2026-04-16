<script lang="ts">
  import type {
    IContemporary,
    IFwFeature
  } from "@21n/types/featureWheel.type";
  import FeatureRow from "@21n/components/featureWheel/sidePanel/comparisionTable/FeatureRow.svelte";

  let {
    category,
    features = [],
    contemporaries = []
  }: {
    category: string;
    features?: IFwFeature[];
    contemporaries?: IContemporary[];
  } = $props();
</script>

<tr>
  <td
    class="border border-bgs3 p-2 font-medium bg-bgs2"
    colspan={contemporaries.length + 1}
  >
    {category}
  </td>
</tr>

{#each features as feature}
  <FeatureRow {feature} {contemporaries} />
{/each}
