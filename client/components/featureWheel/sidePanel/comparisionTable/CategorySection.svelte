<script lang="ts">
  import type {
    IContemporary,
    IFwFeature
  } from "$lib/client/types/featureWheel.type";
  import FeatureRow from "./FeatureRow.svelte";

  export let category: string;
  export let features: IFwFeature[] = [];
  export let contemporaries: IContemporary[] = [];
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
