<script lang="ts">
  import type {
    IContemporary,
    IFwFeature
  } from "$lib/client/types/featureWheel.type";
  import RatingCell from "./RatingCell.svelte";
  import NotesCell from "./NotesCell.svelte";

  export let feature: IFwFeature;
  export let contemporaries: IContemporary[] = [];

  // Find the rating for a specific contemporary in this feature
  function getContemporaryRating(
    contemporaryLabel: string
  ): number | undefined {
    const contemporary = feature.contemporaries.find(
      (c) => c.label.toLowerCase() === contemporaryLabel.toLowerCase()
    );
    return contemporary?.value;
  }

  // Find the notes for a specific contemporary in this feature
  function getContemporaryNotes(contemporaryLabel: string): string | undefined {
    const contemporary = feature.contemporaries.find(
      (c) => c.label.toLowerCase() === contemporaryLabel.toLowerCase()
    );
    return contemporary?.notes;
  }
</script>

<tr>
  <td class="border border-bgs3 p-2">{feature.label}</td>
  {#each contemporaries as contemporary}
    <td class="border border-bgs3 p-2">
      {#if getContemporaryRating(contemporary.label) !== undefined}
        <div class="flex items-center gap-2">
          <RatingCell value={getContemporaryRating(contemporary.label) ?? 0} />
          {#if getContemporaryNotes(contemporary.label)}
            <NotesCell notes={getContemporaryNotes(contemporary.label)} />
          {/if}
        </div>
      {:else}
        <span class="text-fgs4">-</span>
      {/if}
    </td>
  {/each}
</tr>
