<script lang="ts">
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import type {
    IFwFeature,
    IFwCategory,
    IContemporary
  } from "@21n/types/featureWheel.type";
  import ComparisonTable from "@21n/components/featureWheel/sidePanel/comparisionTable/ComparisonTable.svelte";
  import CollapsibleList from "@21n/landing/shared/collapsible/CollapsibleList.svelte";
  import ExternalLogo from "@21n/branding/external/ExternalLogo.svelte";
  import { properCase } from "@21n/shared-utils/text.utils";
  import TextCard from "@21n/components/featureWheel/sidePanel/card/TextCard.svelte";
  import CardListContent from "@21n/components/featureWheel/sidePanel/card/CardListContent.svelte";
  import ComparisionTableWithAppsAsColumns from "@21n/components/featureWheel/sidePanel/comparisionTable/ComparisionTableWithAppsAsColumns.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import Badge from "@21n/elements/text/Badge.svelte";
  import HowToUse from "@21n/components/featureWheel/sidePanel/HowToUse.svelte";
  import { renderMdAsHtml } from "@21n/components/markdown/markdown.utils";
  import FooterInfo from "@21n/components/featureWheel/sidePanel/comparisionTable/FooterInfo.svelte";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";

  let {
    product,
    features = [],
    categories = [],
    contemporaries = [],
    featureView = undefined,
    selectedCompare = undefined,
    selectedCategories = undefined,
    selectedFeatures = undefined,
    isShowGoBack = false,
    onClose = () => {},
    onFeature = (_value: string) => {},
    onGoBack = () => {}
  }: {
    product: string;
    features?: IFwFeature[];
    categories?: IFwCategory[];
    contemporaries?: IContemporary[];
    featureView?: string;
    selectedCompare?: string[];
    selectedCategories?: string[];
    selectedFeatures?: string[];
    isShowGoBack?: boolean;
    onClose?: () => void;
    onFeature?: (value: string) => void;
    onGoBack?: () => void;
  } = $props();

  const isHowToUse = $derived(featureView === "howToUse");
  const feature = $derived(
    featureView ? features.find((f) => f.label === featureView) : undefined
  );
</script>

<div
  class="flex flex-col gap-8 flex-1 w-1/2 min-w-1/2 bg-bgs1 rounded-md p-4 dp:p-6 2k:p-8"
>
  {#if isShowGoBack}
    <button
      class="flex items-center gap-2 justify-start"
      onclick={() => {
        onGoBack();
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
          <span> Comparison with </span>
          {#if contemporary}
            <div class="w-5 h-5 border border-brs3 rounded-full">
              <ExternalLogo provider={contemporary} url={contemporary.url} />
            </div>
          {/if}
          {properCase(selectedCompare[0])}
        </div>
      {:else}
        Comparison report
      {/if}
    </div>
    <button
      class="flex items-center gap-2"
      onclick={() => {
        onClose();
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
        {onFeature}
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
              {#snippet additional()}
                <CardListContent
                  items={(contemporary.distribution?.available ?? []).map((d) => ({
                    label: properCase(d)
                  }))}
                />
              {/snippet}
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
