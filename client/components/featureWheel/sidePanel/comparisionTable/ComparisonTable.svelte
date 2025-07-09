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
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import FooterInfo from "./FooterInfo.svelte";

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
  <table class="w-full border-collapse table-fixed text-b2">
    <thead>
      <tr class="bg-bgs2">
        <HeaderTitle icon="ph:squares-four-light" label="App" />
        {#if feature.comparisionProperties}
          {#each feature.comparisionProperties as property}
            <HeaderTitle icon="ph:question-light" label={property} />
          {/each}
        {/if}
        <HeaderTitle icon="ph:currency-dollar-light" label="Price *" />
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
          <td
            colspan="4"
            class="border border-brs3 p-2 py-4 text-center text-fgs3 text-b3"
            >No comparison data available</td
          >
        </tr>
      {/if}
    </tbody>
  </table>
  <FooterInfo />
  <div class="flex gap-2 items-start mt-8">
    <div class="mt-0.5">
      <Icon icon="ph:question-light" size={Size.sm} class="text-fgs2" />
    </div>
    <span class="text-fgs2 text-b3">
      If you don't see an app in the table, it may be because the app doesn't
      have the feature being discussed. Or it didn't match the filters you
      selected. Or we haven't completed our research and benchmarking for that
      app yet.
    </span>
  </div>
  <ScrollViewBottomSpacer />
</div>
