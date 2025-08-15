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
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import HowToUse from "./HowToUse.svelte";
  import { renderMdAsHtml } from "../../markdown/markdown.utils";
  import FooterInfo from "./comparisionTable/FooterInfo.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";

  export let product: string;
  export let features: IFwFeature[] = [];
  export let categories: IFwCategory[] = [];
  export let contemporaries: IContemporary[] = [];
  export let featureView: string | undefined = undefined;
  export let selectedCompare: string[] | undefined = undefined;
  export let selectedCategories: string[] | undefined = undefined;
  export let selectedFeatures: string[] | undefined = undefined;
  export let isShowGoBack: boolean = false;
  $: isHowToUse = featureView === "howToUse";
  $: feature = featureView
    ? features.find((f) => f.label === featureView)
    : undefined;
  const dispatch = createEventDispatcher();
</script>

<div
  class="flex flex-col gap-8 flex-1 w-1/2 min-w-1/2 bg-bgs1 rounded-md p-4 dp:p-6 2k:p-8"
>
  {#if isShowGoBack}
    <button
      class="flex items-center gap-2 justify-start"
      on:click={() => {
        dispatch("goBack");
      }}
    >
      <Icon icon="back-sm" />
      Go back
    </button>
  {/if}
  <div class="flex w-full justify-between">
    <div class="flex text-h4 text-fgs2">
      {#if selectedCompare?.length === 0}
        {#if isHowToUse}
          How to use this wheel?
        {:else if featureView}
          {featureView}
          {#if feature?.isPlanned}
            <div class="flex items-center p-1">
              <Badge text="Planned" />
            </div>
          {/if}
          <!-- {:else if selectedCategories?.length === 1}
        {selectedCategories[0]} -->
        {/if}
      {:else if selectedFeatures?.length === 1}
        {selectedFeatures[0]}
      {:else if selectedCompare?.length === 1}
        {@const contemporary = contemporaries.find(
          (c) => c.label === selectedCompare[0]
        )}
        <div class="flex items-center gap-1">
          <span> Comparision with </span>
          {#if contemporary}
            <ExternalLogo provider={contemporary} />
          {/if}
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
      <SvgIcon icon="ph:x" phIconSize={Size.lg} />
    </button>
  </div>
  <div class="overflow-y-auto flex flex-col flex-1 w-full gap-8">
    {#if featureView && feature}
      <div class="flex flex-col gap-4 dp:gap-6 2k:gap-8 h-full w-full">
        <TextCard
          title="What is {feature.label}?"
          content={feature.description}
          image={feature.image}
          icon={feature.icon ??
            feature.shortLabel?.toLowerCase() ??
            feature.label.toLowerCase().replaceAll(" ", "")}
          learnMoreLink={feature.learnMoreLink}
        />
        <div class="flex flex-col gap-2">
          {#key selectedCompare?.length}
            <ComparisonTable {feature} {selectedCompare} {contemporaries} />
          {/key}
        </div>
        {#if feature.ratingCriteria}
          <TextCard title="Our rating criteria">
            <CardListContent items={feature.ratingCriteria} />
          </TextCard>
        {/if}
        {#if feature.notes}
          <TextCard>
            <div class="flex items-center">
              <SvgIcon icon={product} />
              <span class="font-medium">
                {properCase(product)}
              </span>
            </div>
            <span class="text-fgs2 text-b2"
              >{@html renderMdAsHtml(feature.notes)}</span
            >
          </TextCard>
        {/if}
        <ScrollViewBottomSpacer />
        <div class="flex mt-auto">
          <FooterInfo />
        </div>
      </div>
    {:else if selectedCompare && selectedCompare.length > 0}
      <ComparisionTableWithAppsAsColumns
        {product}
        {features}
        {categories}
        {contemporaries}
        {selectedCompare}
        {selectedFeatures}
        {selectedCategories}
        on:feature
      />
      {#if selectedCompare.length === 1}
        {@const contemporary = contemporaries.find(
          (c) => c.label === selectedCompare[0]
        )}
        <div class="flex flex-col gap-8">
          {#if contemporary?.distribution}
            <TextCard
              title="Availability of {selectedCompare[0]}"
              content={contemporary.distribution.description}
              learnMoreLink={contemporary.distribution.link}
            >
              <div slot="additional">
                <CardListContent
                  items={contemporary.distribution.available.map((d) => ({
                    label: properCase(d)
                  }))}
                />
              </div>
            </TextCard>
          {/if}
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
          {#if contemporary?.latestAnalysisDate}
            <div class="flex w-full justify-center text-fgs3 text-b3">
              <span>
                Last updated: {contemporary?.latestAnalysisDate}
              </span>
            </div>
          {/if}
        </div>
      {/if}
    {:else if isHowToUse}
      <HowToUse />
    {:else}
      <span class="text-fgs2 text-b2">
        Please click on a feature from the wheel or select apps to compare from
        the dropdown.
      </span>
    {/if}
  </div>
</div>
