<script lang="ts">
  import ComparisonRow from "./ComparisonRow.svelte";
  import type {
    IContemporary,
    IFeatureWheelContemporary,
    IFwFeature
  } from "$lib/client/types/featureWheel.type";
  import HeaderTitle from "./HeaderTitle.svelte";

  export let feature: IFwFeature;
  export let contemporaries: IContemporary[] = [];
  export let selectedCompare: string[] | undefined = undefined;
  let featureContemporaries: IFeatureWheelContemporary[] =
    feature.contemporaries?.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)) ??
    [];

  function isSelected(label: string): boolean {
    return (
      !selectedCompare ||
      selectedCompare.length === 0 ||
      selectedCompare.includes(label)
    );
  }
</script>

<div class="flex flex-col gap-2">
  <div class="text-h5 font-medium">Comparison</div>
  <table class="w-full border-collapse">
    <thead>
      <tr class="bg-bgs2">
        <HeaderTitle icon="ph:squares-four-light" label="App" />
        {#if feature.comparisionProperties}
          {#each feature.comparisionProperties as property}
            <HeaderTitle icon="ph:question-light" label={property} />
          {/each}
        {/if}
        <HeaderTitle icon="ph:star-light" label="Rating" />
        <HeaderTitle icon="ph:question-light" label="Notes" />
      </tr>
    </thead>
    <tbody>
      {#if featureContemporaries && featureContemporaries.length > 0}
        {#each featureContemporaries as contemporary}
          {#if isSelected(String(contemporary.label))}
            <ComparisonRow
              {contemporary}
              contemporaryDetail={contemporaries.find(
                (c) => c.label === contemporary.label
              ) ?? {}}
              additionalProperties={feature.comparisionProperties}
            />
          {/if}
        {/each}
      {:else}
        <tr>
          <td colspan="3" class="border border-bgs3 p-2 text-center"
            >No comparison data available</td
          >
        </tr>
      {/if}
    </tbody>
  </table>
</div>
