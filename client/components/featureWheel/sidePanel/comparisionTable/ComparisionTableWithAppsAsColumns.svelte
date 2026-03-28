<script lang="ts">
  import { properCase } from "@21n/shared-utils/text.utils";
  import type {
    IContemporary,
    IFwCategory,
    IFwFeature
  } from "@21n/types/featureWheel.type";
  import TableHeader from "@21n/components/featureWheel/sidePanel/comparisionTable/TableHeader.svelte";
  import RatingCell from "@21n/components/featureWheel/sidePanel/comparisionTable/RatingCell.svelte";
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import NotesCell from "@21n/components/featureWheel/sidePanel/comparisionTable/NotesCell.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import Badge from "@21n/elements/text/Badge.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import FooterInfo from "@21n/components/featureWheel/sidePanel/comparisionTable/FooterInfo.svelte";
  import { mapValue } from "@21n/components/featureWheel/sidePanel/comparisionTable/table.utils";

  const dispatch = createEventDispatcher();
  export let product: string;
  export let features: IFwFeature[] = [];
  export let categories: IFwCategory[] = [];
  export let contemporaries: IContemporary[] = [];
  export let selectedCompare: string[] | undefined = undefined;
  export let selectedFeatures: string[] | undefined = undefined;
  export let selectedCategories: string[] | undefined = undefined;
  $: categories;

  // Toggle for showing planned features
  let showPlannedFeatures = false;
  let showJustAvailability = false;
  const dev_isEnablePlannedFeaturesToggle = true;
  // Find the rating for a specific contemporary in a feature
  function getContemporaryRating(
    feature: IFwFeature,
    contemporaryLabel: string
  ): number | undefined {
    const contemporary = feature.contemporaries.find(
      (c) => c.label.toLowerCase() === contemporaryLabel.toLowerCase()
    );
    return contemporary?.value;
  }

  // Find the notes for a specific contemporary in a feature
  function getContemporaryNotes(
    feature: IFwFeature,
    contemporaryLabel: string
  ): string | undefined {
    const contemporary = feature.contemporaries.find(
      (c) => c.label.toLowerCase() === contemporaryLabel.toLowerCase()
    );
    return contemporary?.notes;
  }

  // Filter features based on selected features or categories and planned status
  $: filteredFeatures = selectedFeatures?.length
    ? features.filter(
        (feature) =>
          selectedFeatures.includes(feature.label) &&
          (showPlannedFeatures || !feature.isPlanned) &&
          !feature.isHideForComparer
      )
    : selectedCategories?.length
      ? features.filter(
          (feature) =>
            selectedCategories.includes(feature.category) &&
            (showPlannedFeatures || !feature.isPlanned) &&
            !feature.isHideForComparer
        )
      : features.filter(
          (feature) =>
            !feature.isHideForComparer &&
            (showPlannedFeatures || !feature.isPlanned)
        );

  // Group features by category
  $: groupedFeatures = filteredFeatures.reduce(
    (acc, feature) => {
      const category = feature.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(feature);
      return acc;
    },
    {} as Record<string, IFwFeature[]>
  );

  // Get unique category labels
  $: categoryLabels = Object.keys(groupedFeatures).sort();

  // Filter contemporaries based on selectedCompare
  $: filteredContemporaries = selectedCompare?.length
    ? contemporaries.filter((c) => selectedCompare.includes(c.label))
    : contemporaries;
</script>

<div class="flex flex-col gap-2">
  <div class="flex justify-between items-center">
    <div class="text-h5 font-medium">Comparison</div>
    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          bind:checked={showJustAvailability}
          class="w-4 h-4"
        />
        <span class="text-fgs2 text-sm">Hide rating</span>
      </label>
      {#if dev_isEnablePlannedFeaturesToggle}
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={showPlannedFeatures}
            class="w-4 h-4"
          />
          <span class="text-fgs2 text-sm">Include planned features</span>
        </label>
      {/if}
    </div>
  </div>
  <table class="w-full border-collapse table-fixed">
    <thead>
      <tr class="bg-bgs3/80">
        <th class="border border-brs3 p-2 text-left font-medium">Feature</th>
        <th class="border border-brs3 p-2 text-left">
          <span class="flex items-center gap-1 font-medium">
            <SvgIcon icon={product} />
            {properCase(product)}
          </span>
        </th>
        {#each filteredContemporaries as contemporary}
          <TableHeader {contemporary} />
        {/each}
      </tr>
    </thead>
    <tbody>
      <!-- First render general comparison properties -->
      <tr class="text-b2">
        <td class="border border-brs3 p-2">Price *</td>
        <td class="border border-brs3 p-2">$5</td>
        {#each filteredContemporaries as contemporary}
          <td class="border border-brs3 p-2">
            {contemporary.price ? `$${contemporary.price}` : "Free"}
          </td>
        {/each}
      </tr>
      <tr class="text-b2">
        <td class="border border-brs3 p-2">Source type</td>
        <td class="border border-brs3 p-2">Open source</td>
        {#each filteredContemporaries as contemporary}
          <td class="border border-brs3 p-2">
            {mapValue("sourcingType", contemporary.sourcingType)}
          </td>
        {/each}
      </tr>

      <!-- Then render features by category -->
      {#each categoryLabels as categoryLabel}
        <tr>
          <td
            class="border border-brs3 p-2 text-fgs3 bg-bgs2"
            colspan={filteredContemporaries.length + 2}
          >
            {categoryLabel}
          </td>
        </tr>

        {#each groupedFeatures[categoryLabel] as feature}
          <tr class="text-b2">
            <td
              class={cn("border border-brs3 p-2 cursor-pointer", {
                "text-fgs3": feature.isPlanned,
                "hover:text-aps1": !feature.isPlanned
              })}
              on:click={() => {
                if (feature.isPlanned) {
                  return;
                }
                dispatch("feature", feature.label);
              }}>{feature.label}</td
            >
            <td class="border border-brs3 p-2 font-medium">
              {#if feature.isPlanned}
                <div class="flex text-aps1">
                  <Badge text="Planned" />
                </div>
              {:else}
                <RatingCell value={1} {showJustAvailability} />
              {/if}
            </td>
            {#each filteredContemporaries as contemporary}
              <td class="border border-brs3 p-2">
                {#if getContemporaryRating(feature, contemporary.label) !== undefined}
                  <div class="flex items-center gap-2">
                    {#if feature.isPlanned}
                      -
                    {:else}
                      <RatingCell
                        value={getContemporaryRating(
                          feature,
                          contemporary.label
                        ) ?? 0}
                        {showJustAvailability}
                      />
                    {/if}
                    {#if getContemporaryNotes(feature, contemporary.label)}
                      <NotesCell
                        notes={getContemporaryNotes(
                          feature,
                          contemporary.label
                        )}
                        {contemporary}
                        {feature}
                        isShort={true}
                      />
                    {/if}
                  </div>
                {:else if feature.isPlanned}
                  -
                {:else}
                  <Icon icon="cross" class="text-ars1" />
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
  <FooterInfo />
</div>
