<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { createEventDispatcher } from "svelte";
  import type {
    IFwFeature,
    IFwCategory,
    IContemporary
  } from "$lib/client/types/featureWheel.type";
  import ComparisonTable from "./comparisionTable/ComparisonTable.svelte";
  import CollapsibleList from "$lib/client/landing/shared/collapsible/CollapsibleList.svelte";
  import ExternalLogo from "$lib/client/branding/external/ExternalLogo.svelte";
  import { properCase } from "$lib/shared/utils/text.utils";
  import TextCard from "./card/TextCard.svelte";
  import CardListContent from "./card/CardListContent.svelte";
  import ComparisionTableWithAppsAsColumns from "./comparisionTable/ComparisionTableWithAppsAsColumns.svelte";

  export let product: string;
  export let features: IFwFeature[] = [];
  export let categories: IFwCategory[] = [];
  export let contemporaries: IContemporary[] = [];
  export let featureView: string | undefined = undefined;
  export let selectedCompare: string[] | undefined = undefined;
  export let selectedCategories: string[] | undefined = undefined;
  export let selectedFeatures: string[] | undefined = undefined;
  $: isHowToUse = featureView === "howToUse";
  const dispatch = createEventDispatcher();
</script>

<div
  class="flex flex-col gap-8 flex-1 w-1/2 min-w-1/2 bg-bgs2 rounded-md p-4 dp:p-6 2k:p-8"
>
  <div class="flex w-full justify-between">
    <div class="flex text-h4 text-fgs2">
      {#if isHowToUse}
        How to use this wheel?
      {:else if featureView}
        {featureView}
        <!-- {:else if selectedCategories?.length === 1}
        {selectedCategories[0]} -->
      {:else if selectedFeatures?.length === 1}
        {selectedFeatures[0]}
      {:else if selectedCompare?.length === 1}
        {@const contemporary = contemporaries.find(
          (c) => c.label === selectedCompare[0]
        )}
        <div class="flex items-center gap-1">
          <span> Comparision with </span>
          <ExternalLogo provider={contemporary} />
          {properCase(selectedCompare[0])}
        </div>
      {:else}
        Comparision report
      {/if}
    </div>
    <button
      class="flex items-center gap-2"
      on:click={() => {
        dispatch("close");
      }}
    >
      <SvgIcon icon="close" />
    </button>
  </div>
  <div class="overflow-y-auto flex flex-col gap-8">
    {#if featureView}
      {@const feature = features.find((f) => f.label === featureView)}
      {#if feature}
        <div class="flex flex-col gap-4 dp:gap-6 2k:gap-8">
          <TextCard
            title="What is {feature.label}?"
            content={feature.description}
          />
          {#if feature.ratingCriteria}
            <TextCard title="Our rating criteria">
              <CardListContent items={feature.ratingCriteria} />
            </TextCard>
          {/if}
          <div class="flex flex-col gap-2">
            <ComparisonTable {feature} {selectedCompare} {contemporaries} />
          </div>
          {#if feature.notes}
            <TextCard title="Additional information" content={feature.notes} />
          {/if}
        </div>
      {/if}
    {:else if selectedCompare}
      <ComparisionTableWithAppsAsColumns
        {product}
        {features}
        {categories}
        {contemporaries}
        {selectedCompare}
        {selectedFeatures}
        {selectedCategories}
      />
      {#if selectedCompare.length === 1}
        {@const contemporary = contemporaries.find(
          (c) => c.label === selectedCompare[0]
        )}
        <div class="flex flex-col gap-8">
          {#if contemporary?.whenToChoose}
            <TextCard title="When to choose {selectedCompare[0]}?">
              <CardListContent items={contemporary?.whenToChoose} />
            </TextCard>
          {/if}
          {#if contemporary?.faqs}
            <TextCard title="FAQs">
              <CollapsibleList items={contemporary?.faqs} />
            </TextCard>
          {/if}
          {#if contemporary?.switchFromDocumentation}
            <div class="text-fgs2 text-b2">
              <span>
                For feature mapping and switching from {selectedCompare[0]},
                Please refer to the
                <a
                  href={contemporary?.switchFromDocumentation}
                  class="underline-dotted"
                >
                  documentation
                </a>
              </span>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>
