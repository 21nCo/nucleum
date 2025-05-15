<script lang="ts">
  import { properCase } from "$lib/shared/utils/text.utils";
  import CategorySection from "./CategorySection.svelte";
  import type {
    IContemporary,
    IFwCategory,
    IFwFeature
  } from "$lib/client/types/featureWheel.type";
  import TableHeader from "./TableHeader.svelte";
  import RatingCell from "./RatingCell.svelte";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import NotesCell from "./NotesCell.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  export let product: string;
  export let features: IFwFeature[] = [];
  export let categories: IFwCategory[] = [];
  export let contemporaries: IContemporary[] = [];
  export let selectedCompare: string[] | undefined = undefined;
  export let selectedFeatures: string[] | undefined = undefined;
  export let selectedCategories: string[] | undefined = undefined;

  // Toggle for showing planned features
  let showPlannedFeatures = false;
  let showJustAvailability = false;
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
          (showPlannedFeatures || !feature.isPlanned)
      )
    : selectedCategories?.length
      ? features.filter(
          (feature) =>
            selectedCategories.includes(feature.category) &&
            (showPlannedFeatures || !feature.isPlanned)
        )
      : features.filter((feature) => showPlannedFeatures || !feature.isPlanned);

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
          bind:checked={showPlannedFeatures}
          class="w-4 h-4"
        />
        <span class="text-fgs2 text-sm">Show planned features</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          bind:checked={showJustAvailability}
          class="w-4 h-4"
        />
        <span class="text-fgs2 text-sm">Hide rating</span>
      </label>
    </div>
  </div>
  <table class="w-full border-collapse">
    <thead>
      <tr class="bg-bgs2">
        <th class="border border-bgs3 p-2 text-left">Feature</th>
        <th class="border border-bgs3 p-2 text-left text-aps1 font-medium">
          <span class="flex items-center gap-1">
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
      <tr>
        <td class="border border-bgs3 p-2">Price (USD/month billed annually)</td
        >
        <td class="border border-bgs3 p-2">Free</td>
        {#each filteredContemporaries as contemporary}
          <td class="border border-bgs3 p-2">
            {contemporary.price ? `$${contemporary.price}` : "Free"}
          </td>
        {/each}
      </tr>
      <tr>
        <td class="border border-bgs3 p-2">Source type</td>
        <td class="border border-bgs3 p-2">SOURCE AVAILABLE</td>
        {#each filteredContemporaries as contemporary}
          <td class="border border-bgs3 p-2">
            {contemporary.sourcingType
              ? contemporary.sourcingType.replace(/_/g, " ")
              : "-"}
          </td>
        {/each}
      </tr>

      <!-- Then render features by category -->
      {#each categoryLabels as categoryLabel}
        <tr>
          <td
            class="border border-bgs3 p-2 font-medium bg-bgs2"
            colspan={filteredContemporaries.length + 2}
          >
            {categoryLabel}
          </td>
        </tr>

        {#each groupedFeatures[categoryLabel] as feature}
          <tr>
            <td class="border border-bgs3 p-2">{feature.label}</td>
            <td class="border border-bgs3 p-2 font-medium">
              {#if feature.isPlanned}
                <span class="text-aps2">Planned</span>
              {:else}
                <RatingCell value={1} {showJustAvailability} />
              {/if}
            </td>
            {#each filteredContemporaries as contemporary}
              <td class="border border-bgs3 p-2">
                {#if getContemporaryRating(feature, contemporary.label) !== undefined}
                  <div class="flex items-center gap-2">
                    <RatingCell
                      value={getContemporaryRating(
                        feature,
                        contemporary.label
                      ) ?? 0}
                      {showJustAvailability}
                    />
                    {#if getContemporaryNotes(feature, contemporary.label)}
                      <NotesCell
                        notes={getContemporaryNotes(
                          feature,
                          contemporary.label
                        )}
                      />
                    {/if}
                  </div>
                {:else}
                  <Icon icon="ph:x" class="text-ars1" />
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
</div>
