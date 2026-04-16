<script lang="ts">
  import {
    FeatureWheelMode,
    type IContemporary,
    type IFeatureWheel,
    type IFeatureWheelContemporary,
    type IFeatureWheelGroup,
    type IFwCategory,
    type IFwFeature
  } from "@21n/types/featureWheel.type";
  import Wheel from "@21n/components/featureWheel/wheel/Wheel.svelte";
  import FwOptionsPanel from "@21n/components/featureWheel/options/FwOptionsPanel.svelte";
  import FwSidePanel from "@21n/components/featureWheel/sidePanel/FwSidePanel.svelte";
  import { cn } from "@21n/utils/ui.utils";
  let {
    product,
    title = undefined,
    features,
    categories,
    contemporaries,
    mode
  }: {
    product: string;
    title?: string | undefined;
    features: IFwFeature[];
    categories: IFwCategory[];
    contemporaries: IContemporary[];
    mode: FeatureWheelMode;
  } = $props();
  let wheel: IFeatureWheel | undefined = $state(undefined);
  let selectedCategories = $state<string[] | undefined>(undefined);
  let selectedFeatures = $state<string[] | undefined>(undefined);
  let includePlannedFeatures = $state(false);
  /**
   * Selected contemporaries to be compared with
   */
  let selectedCompare = $state<string[] | undefined>(undefined);
  /**
   * Feature that is clicked to view
   */
  let featureView = $state<string | undefined>(undefined);
  let refreshId = $state(new Date().getTime());
  let isShowSidePanel = $state(false);
  let isShowGoBack = $state(false);

  $effect(() => {
    product;
    categories;
    features;
    contemporaries;
    mode;
    selectedCategories;
    selectedCompare;
    includePlannedFeatures;
    refreshWheel();
  });

  function hydrateContemporary(
    contemporary: IFeatureWheelContemporary
  ): IFeatureWheelContemporary {
    const data = contemporaries.find((c) => c.label === contemporary.label);
    return {
      ...contemporary,
      url: data?.url ?? "",
      icon: data?.icon
    };
  }

  function refreshWheel() {
    const groups: IFeatureWheelGroup[] = [];
    let filteredCategories = categories;
    if (selectedCategories && selectedCategories.length > 0) {
      filteredCategories = categories?.filter((category: IFwCategory) =>
        selectedCategories?.includes(category.label)
      );
    }
    for (const category of filteredCategories) {
      const group: IFeatureWheelGroup = {
        label: category.label,
        color: category.color,
        spokes: features
          .filter(
            (feature: IFwFeature) =>
              feature.category === category.label &&
              (mode === FeatureWheelMode.COMPARER
                ? (includePlannedFeatures || !feature.isPlanned) &&
                  !feature.isHideForComparer
                : true)
          )
          .map((feature: IFwFeature) => ({
            ...feature,
            label: feature.label,
            shortLabel: feature.shortLabel,
            contemporaries:
              selectedCompare && selectedCompare.length > 0
                ? feature.contemporaries.filter(
                    (contemporary: IFeatureWheelContemporary) => {
                      const contemporaryDetail = contemporaries.find(
                        (c) => c.label === contemporary.label
                      );
                    return (
                      !contemporaryDetail?.isHideForComparer &&
                      selectedCompare?.includes(contemporary.label)
                    );
                    }
                  )
                : feature.contemporaries.filter(
                    (contemporary: IFeatureWheelContemporary) => {
                      const contemporaryDetail = contemporaries.find(
                        (c) => c.label === contemporary.label
                      );
                      return !contemporaryDetail?.isHideForComparer;
                    }
                  )
          }))
          .map((spoke: IFwFeature) => ({
            ...spoke,
            contemporaries: spoke.contemporaries.map(hydrateContemporary)
          }))
      };
      groups.push(group);
    }
    wheel = {
      product,
      groups
    };
    refreshId = new Date().getTime();
  }

  function onFeatureClick(spoke: string) {
    if (spoke === featureView) {
      featureView = undefined;
      if (!selectedCompare || selectedCompare.length < 1) {
        isShowSidePanel = false;
      }
      return;
    }
    const featureDetail = features.find((f) => f.label === spoke);
    if (
      featureDetail?.isHideForComparer ||
      !featureDetail ||
      featureDetail.isPlanned
    ) {
      return;
    }
    isShowSidePanel = true;
    featureView = spoke;
  }
</script>

<div class="flex gap-8 w-full flex-1 min-h-0 p-3">
  <div
    class={cn("flex h-full", {
      "flex-col gap-6 w-1/2": isShowSidePanel,
      "gap-3 w-full justify-center items-center": !isShowSidePanel
    })}
  >
    <div
      class={cn({
        "w-1/4 max-w-96 h-full": !isShowSidePanel,
        "h-fit w-full": isShowSidePanel
      })}
    >
      <FwOptionsPanel
        {mode}
        {title}
        {categories}
        {features}
        {contemporaries}
        isHorizontal={isShowSidePanel}
        bind:selectedCategories
        bind:selectedFeatures
        bind:selectedCompare
        bind:includePlannedFeatures
        onHowToUse={() => {
          featureView = "howToUse";
          selectedCompare = undefined;
          isShowSidePanel = true;
        }}
        onReport={() => {
          isShowSidePanel = true;
        }}
      />
    </div>
    <div
      class={cn({
        "h-full flex-1": !isShowSidePanel,
        "h-[70%] 2k:h-[80%] w-full": isShowSidePanel
      })}
    >
      {#if wheel}
        {#key refreshId}
          <Wheel
            {mode}
            {wheel}
            selectedSpoke={featureView}
            onSpokeClick={(detail) => {
              if (detail.spoke.includes("+")) {
                selectedCategories = [detail.group];
              } else {
                onFeatureClick(detail.spoke);
              }
            }}
            onContemporary={(detail) => {
              if (!detail.spoke) return;
              onFeatureClick(detail.spoke);
            }}
          />
        {/key}
      {/if}
    </div>
  </div>
  {#if isShowSidePanel}
    {#key featureView}
      <FwSidePanel
        {product}
        {features}
        {categories}
        {contemporaries}
        {featureView}
        {selectedCompare}
        {selectedCategories}
        {selectedFeatures}
        {isShowGoBack}
        onClose={() => {
          isShowSidePanel = false;
          featureView = undefined;
        }}
        onFeature={(value) => {
          featureView = value;
          isShowGoBack = true;
        }}
        onGoBack={() => {
          isShowGoBack = false;
          featureView = undefined;
        }}
      />
    {/key}
  {/if}
</div>
