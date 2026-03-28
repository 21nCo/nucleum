<script lang="ts">
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import type {
    FeatureWheelMode,
    IContemporary,
    IFwCategory,
    IFwFeature
  } from "@21n/types/featureWheel.type";
  import { popover } from "@21n/actions/popover.action";
  import { properCase } from "@21n/shared-utils/text.utils";
  import { cn } from "@21n/utils/ui.utils";
  import Badge from "@21n/elements/text/Badge.svelte";
  import ExternalLogo from "@21n/branding/external/ExternalLogo.svelte";
  import ContemporarySelectorPopover from "@21n/components/featureWheel/options/ContemporarySelectorPopover.svelte";
  import { createEventDispatcher } from "svelte";
  import FwCategoryLegend from "@21n/components/featureWheel/options/FwCategoryLegend.svelte";
  import FeatureSelectorPopover from "@21n/components/featureWheel/options/FeatureSelectorPopover.svelte";
  import Button from "@21n/landing/shared/elements/Button.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import type { ISelectValue } from "@21n/types/select.type";
  const dispatch = createEventDispatcher();
  export let mode: FeatureWheelMode;
  export let title: string | undefined = undefined;
  export let categories: IFwCategory[];
  export let features: IFwFeature[];
  export let contemporaries: IContemporary[];
  export let selectedCategories: string[] | undefined = undefined;
  export let selectedFeatures: string[] | undefined = undefined;
  export let selectedCompare: string[] | undefined = undefined;
  export let includePlannedFeatures: boolean = false;
  export let isHorizontal = false;
  let isFeatureSelectorOpen = false;
  let isCompareWithSelectorOpen = false;
  const dev_IsEnableFeatureSelector = false;
  const dev_IsEnablePlannedFeaturesToggle = false;
  let ref: HTMLButtonElement | null = null;
  // $: contemporariesList = features
  //   .map((feature) => feature.contemporaries)
  //   .flat()
  //   .map((item) => (typeof item.label === "string" ? [item.label] : item.label))
  //   .flat()
  //   .filter((item) => item !== undefined)
  //   .filter((item, index, self) => self.indexOf(item) === index);

  function resolveSelectorClass(isOpen: boolean) {
    return cn(
      "flex w-full items-center gap-6 justify-between text-b2 text-fgs2 border border-brs3 p-2 px-3 rounded-md hover:bg-bgs2",
      {
        "bg-bgs2": isOpen
      }
    );
  }

  function hidePopover() {
    if (ref) {
      ref.dispatchEvent(new CustomEvent("hide"));
    }
  }

  function handleCompareSelect(selected: ISelectValue[]) {
    selectedCompare = selected.map(String);
    dispatch("change", selectedCompare);
  }

  function handleComparePopoverChange(event: Event) {
    const detail = (event as CustomEvent<{ open?: boolean }>).detail;
    isCompareWithSelectorOpen = detail?.open || false;
  }

  function handleFeatureSelect(selected: string[]) {
    selectedFeatures = selected;
    dispatch("change", selectedFeatures);
  }

  function handleFeaturePopoverChange(event: Event) {
    const detail = (event as CustomEvent<{ open?: boolean }>).detail;
    isFeatureSelectorOpen = detail?.open || false;
  }
</script>

<div
  data-mode={mode}
  class={cn(
    "flex  gap-6 items-center justify-between bg-bgs1 rounded-md border border-brs3 p-4",
    {
      "flex-row w-full h-fit": isHorizontal,
      "flex-col min-w-fit h-full": !isHorizontal
    }
  )}
>
  <div class="flex flex-col w-full gap-6">
    <div class="font-medium whitespace-nowrap">
      {title ? title : ""}
    </div>
    <div
      class={cn("flex w-full gap-6", {
        "flex-col": !isHorizontal
      })}
    >
      <div class="flex flex-col gap-2">
        <div class="text-b2 text-fgs3">Compare with</div>
        <button
          bind:this={ref}
          class={resolveSelectorClass(isCompareWithSelectorOpen)}
          use:popover={{
            content: ContemporarySelectorPopover,
            isRenderAsSibling: true,
            offsetInPx: 12,
            componentProps: {
              title: "Select apps to compare",
              selected: selectedCompare,
              options: contemporaries
                .filter((item) => !item.isHideForComparer)
                .map((item) => ({
                  label: properCase(item.label),
                  value: item.label,
                  icon: item.icon ?? item.url
                })),
              comingsoonOptions: contemporaries
                .filter((item) => item.isHideForComparer)
                .map((item) => ({
                  label: properCase(item.label),
                  value: item.label
                })),
              isUseExternalLogoForIcon: true,
              onSelect: handleCompareSelect,
              onSeeComparisonReport: () => {
                hidePopover();
                dispatch("report");
              }
            }
          }}
          on:change={handleComparePopoverChange}
        >
          <div class="flex items-center gap-2 h-6">
            {#if selectedCompare && selectedCompare.length > 0}
              {#each selectedCompare as item}
                {@const contemporary = contemporaries.find(
                  (c) => c.label === item
                )}
                {#if contemporary}
                  <div class="w-5 h-5 border border-brs3 rounded-full">
                    <ExternalLogo
                      provider={contemporary}
                      url={contemporary.url}
                    />
                  </div>
                {/if}
                {#if selectedCompare.length === 1}
                  <span>
                    {properCase(item)}
                  </span>
                {/if}
              {/each}
            {:else}
              <span class="text-fgs2 whitespace-nowrap"> All apps </span>
            {/if}
          </div>
          <SvgIcon icon="chevron-down" isRenderRaw={true} />
        </button>
      </div>

      <div class="w-full flex justify-start">
        <FwCategoryLegend
          {categories}
          {selectedCategories}
          {isHorizontal}
          on:categoryClick={(e) => {
            if (!e.detail?.label) return;
            const newCategory = e.detail.label;
            if (selectedCategories?.includes(newCategory)) {
              selectedCategories = selectedCategories.filter(
                (category) => category !== newCategory
              );
            } else {
              selectedCategories = [...(selectedCategories || []), newCategory];
            }
            dispatch("change", selectedCategories);
          }}
        />
      </div>
      {#if dev_IsEnableFeatureSelector}
        <div class="flex flex-col gap-2">
          <div class="text-b2 text-fgs3">Filter features</div>
          <button
            class={resolveSelectorClass(isFeatureSelectorOpen)}
            bind:this={ref}
            use:popover={{
              content: FeatureSelectorPopover,
              isRenderAsSibling: true,
              offsetInPx: 12,
              componentProps: {
                title: "Choose features",
                selected: selectedFeatures,
                features,
                categories: selectedCategories,
                onSelect: handleFeatureSelect
              }
            }}
            on:change={handleFeaturePopoverChange}
          >
            <div class="flex items-center gap-2">
              <span> Choose features</span>
              {#if selectedCategories && selectedCategories.length > 0}
                <Badge text={selectedCategories.length} />
              {/if}
            </div>
            <SvgIcon icon="chevron-down" isRenderRaw={true} />
          </button>
        </div>
      {/if}
    </div>
  </div>
  {#if !isHorizontal}
    <div class="flex flex-col gap-4 w-full">
      {#if selectedCompare && selectedCompare.length > 0}
        <div class="flex justify-center">
          <Button
            type="secondary"
            label="See comparison report"
            on:click={() => {
              dispatch("report");
            }}
          />
        </div>
      {/if}
      {#if dev_IsEnablePlannedFeaturesToggle}
        <div class="flex justify-center">
          <label
            class="flex items-center gap-2 text-b3 text-fgs2 p-2 rounded-md hover:bg-bgs3 cursor-pointer"
          >
            <input
              type="checkbox"
              bind:checked={includePlannedFeatures}
              on:change={() => dispatch("change", includePlannedFeatures)}
              class="accent-aps1"
            />
            <span>Include planned features</span>
          </label>
        </div>
      {/if}
      <div class="flex justify-center">
        <button
          class="flex items-center gap-1 text-b3 text-fgs2 p-2 rounded-md hover:bg-bgs3"
          on:click={() => {
            dispatch("howToUse");
          }}
        >
          <Icon icon="question" />
          <span> How to use this wheel? </span>
        </button>
      </div>
      <!-- <div class="text-fgs3 text-b4 text-center">Powered by Product router</div> -->
    </div>
  {/if}
</div>
