<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import type {
    FeatureWheelMode,
    IContemporary,
    IFwCategory,
    IFwFeature
  } from "$lib/client/types/featureWheel.type";
  import { popover } from "$lib/client/actions/popover.action";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import ExternalLogo from "$lib/client/branding/external/ExternalLogo.svelte";
  import ContemporarySelectorPopover from "./ContemporarySelectorPopover.svelte";
  import { createEventDispatcher } from "svelte";
  import FwCategoryLegend from "./FwCategoryLegend.svelte";
  import FeatureSelectorPopover from "./FeatureSelectorPopover.svelte";
  import Button from "$lib/client/landing/shared/elements/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
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
</script>

<div
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
              options: contemporaries.map((item) => ({
                label: properCase(item.label),
                value: item.label,
                icon: item.icon ?? item.label.toLowerCase()
              })),
              isUseExternalLogoForIcon: true,
              onSelect: (selected) => {
                selectedCompare = selected;
                dispatch("change", selected);
              },
              onSeeComparisonReport: () => {
                hidePopover();
                dispatch("report");
              }
            }
          }}
          on:change={(e) => {
            isCompareWithSelectorOpen = e.detail?.open || false;
          }}
        >
          <div class="flex items-center gap-2 h-6">
            {#if selectedCompare && selectedCompare.length > 0}
              {#each selectedCompare as item}
                {@const contemporary = contemporaries.find(
                  (c) => c.label === item
                )}
                {#if contemporary}
                  <ExternalLogo provider={contemporary} />
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
          <SvgIcon icon="chevdown" isRenderRaw={true} />
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
                onSelect: (selected) => {
                  selectedFeatures = selected;
                  dispatch("change", selected);
                }
              }
            }}
            on:change={(e) => {
              isFeatureSelectorOpen = e.detail?.open || false;
            }}
          >
            <div class="flex items-center gap-2">
              <span> Choose features</span>
              {#if selectedCategories && selectedCategories.length > 0}
                <Badge text={selectedCategories.length} />
              {/if}
            </div>
            <SvgIcon icon="chevdown" isRenderRaw={true} />
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
      <div class="flex justify-center">
        <button
          class="flex items-center gap-1 text-b3 text-fgs2 p-2 rounded-md hover:bg-bgs3"
          on:click={() => {
            dispatch("howToUse");
          }}
        >
          <Icon icon="ph:question-light" />
          <span> How to use this wheel? </span>
        </button>
      </div>
      <!-- <div class="text-fgs3 text-b4 text-center">Powered by Product router</div> -->
    </div>
  {/if}
</div>
