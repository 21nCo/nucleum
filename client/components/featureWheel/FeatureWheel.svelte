<script lang="ts">
  import {
    FeatureWheelMode,
    type IContemporary,
    type IFeatureWheel,
    type IFeatureWheelGroup,
    type IFwCategory,
    type IFwFeature
  } from "@21n/types/featureWheel.type";
  import Wheel from "@21n/components/featureWheel/wheel/Wheel.svelte";
  import FwOptionsPanel from "@21n/components/featureWheel/options/FwOptionsPanel.svelte";
  import FwSidePanel from "@21n/components/featureWheel/sidePanel/FwSidePanel.svelte";
  import { cn } from "@21n/utils/ui.utils";
  export let product: string;
  export let title: string | undefined = undefined;
  export let features: IFwFeature[];
  export let categories: IFwCategory[];
  export let contemporaries: IContemporary[];
  export let mode: FeatureWheelMode;
  let wheel: IFeatureWheel;
  let selectedCategories: string[] | undefined = undefined;
  let selectedFeatures: string[] | undefined = undefined;
  let includePlannedFeatures: boolean = false;
  /**
   * Selected contemporaries to be compared with
   */
  let selectedCompare: string[] | undefined = undefined;
  /**
   * Feature that is clicked to view
   */
  let featureView: string | undefined = undefined;
  let refreshId: number = new Date().getTime();
  let isShowSidePanel: boolean = false;
  let isShowGoBack: boolean = false;
  refreshWheel();

  function refreshWheel() {
    const groups: IFeatureWheelGroup[] = [];
    let filteredCategories = categories;
    if (selectedCategories && selectedCategories.length > 0) {
      filteredCategories = categories?.filter((category) =>
        selectedCategories?.includes(category.label)
      );
    }
    for (const category of filteredCategories) {
      const group: IFeatureWheelGroup = {
        label: category.label,
        color: category.color,
        spokes: features
          .filter(
            (feature) =>
              feature.category === category.label &&
              (mode === FeatureWheelMode.COMPARER
                ? (includePlannedFeatures || !feature.isPlanned) &&
                  !feature.isHideForComparer
                : true)
          )
          .map((feature) => ({
            ...feature,
            label: feature.label,
            shortLabel: feature.shortLabel,
            contemporaries:
              selectedCompare && selectedCompare.length > 0
                ? feature.contemporaries.filter((contemporary) => {
                    const contemporaryDetail = contemporaries.find(
                      (c) => c.label === contemporary.label
                    );
                    return (
                      !contemporaryDetail?.isHideForComparer &&
                      selectedCompare?.includes(contemporary.label)
                    );
                  })
                : feature.contemporaries.filter((contemporary) => {
                    const contemporaryDetail = contemporaries.find(
                      (c) => c.label === contemporary.label
                    );
                    return !contemporaryDetail?.isHideForComparer;
                  })
          }))
          .map((spoke) => ({
            ...spoke,
            contemporaries: spoke.contemporaries.map((contemporary) => {
              const data = contemporaries.find(
                (c) => c.label === contemporary.label
              );
              return {
                ...contemporary,
                url: data?.url,
                icon: data?.icon
              };
            })
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
        on:change={(e) => {
          refreshWheel();
        }}
        on:howToUse={(e) => {
          featureView = "howToUse";
          selectedCompare = undefined;
          isShowSidePanel = true;
        }}
        on:report={(e) => {
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
            on:spokeClick={(e) => {
              const detail = e.detail;
              if (detail.spoke.includes("+")) {
                selectedCategories = [detail.group];
                refreshWheel();
              } else {
                onFeatureClick(detail.spoke);
              }
            }}
            on:contemporary={(e) => {
              if (!e.detail.spoke) return;
              onFeatureClick(e.detail.spoke);
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
        on:close={() => {
          isShowSidePanel = false;
          featureView = undefined;
        }}
        on:feature={(e) => {
          featureView = e.detail;
          isShowGoBack = true;
        }}
        on:goBack={() => {
          isShowGoBack = false;
          featureView = undefined;
        }}
      />
    {/key}
  {/if}
</div>
