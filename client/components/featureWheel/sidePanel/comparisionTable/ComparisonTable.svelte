<script lang="ts">
  import ComparisonRow from "./ComparisonRow.svelte";
  import type {
    IContemporary,
    IFeatureWheelContemporary,
    IFwFeature
  } from "$lib/client/types/featureWheel.type";
  import HeaderTitle from "./HeaderTitle.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import MarkdownRenderer from "$lib/client/landing/shared/elements/MarkdownRenderer.svelte";

  export let feature: IFwFeature;
  export let contemporaries: IContemporary[] = [];
  export let selectedCompare: string[] | undefined = undefined;
  let featureContemporaries: IFeatureWheelContemporary[] =
    feature.contemporaries
      ?.filter((fc) => {
        const contemporary = contemporaries.find((c) => fc.label === c.label);
        return !contemporary?.isHideForComparer;
      })
      ?.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)) ?? [];

  $: isDataPresent =
    featureContemporaries.filter((c) => isSelected(String(c.label))).length > 0;

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
  <table class="w-full border-collapse table-fixed text-b2">
    <thead>
      <tr class="bg-bgs2">
        <HeaderTitle icon="grid" label="App" />
        {#if feature.comparisionProperties}
          {#each feature.comparisionProperties as property}
            <HeaderTitle icon="question" label={property} />
          {/each}
        {/if}
        <HeaderTitle icon="currency-dollar" label="Price *" />
        <HeaderTitle icon="star" label="Rating" />
        <HeaderTitle icon="question" label="Notes" />
      </tr>
    </thead>
    <tbody>
      {#if isDataPresent}
        {#each featureContemporaries as contemporary}
          {#if isSelected(String(contemporary.label))}
            <ComparisonRow
              {contemporary}
              {feature}
              contemporaryDetail={contemporaries.find(
                (c) => c.label === contemporary.label
              ) ?? {}}
              additionalProperties={feature.comparisionProperties}
            />
          {/if}
        {/each}
      {:else}
        <tr>
          <td
            colspan="4"
            class="border border-brs3 p-2 py-4 text-center text-fgs3 text-b3"
            >No comparison data available</td
          >
        </tr>
      {/if}
    </tbody>
  </table>
  <div class="flex gap-2 items-start mt-3">
    <div class="mt-0.5">
      <Icon icon="question" size={Size.sm} class="text-fgs2" />
    </div>
    <span class="text-fgs2 text-b3">
      <MarkdownRenderer
        text="If you don't see an app in the table, it may be because the app doesn't have the feature being discussed or it is not present in the *Compare with* filter that you selected."
      />
    </span>
  </div>
</div>
