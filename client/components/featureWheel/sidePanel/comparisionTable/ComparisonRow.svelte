<script lang="ts">
  import RatingCell from "./RatingCell.svelte";
  import NotesCell from "./NotesCell.svelte";
  import ExternalLogo from "$lib/client/branding/external/ExternalLogo.svelte";
  import { properCase } from "$lib/shared/utils/text.utils";
  import type {
    IContemporary,
    IFeatureWheelContemporary
  } from "$lib/client/types/featureWheel.type";
  export let contemporary: IFeatureWheelContemporary;
  export let contemporaryDetail: IContemporary;
  export let additionalProperties: string[] = [];
</script>

<tr>
  <td class="border border-bgs3 p-2 flex items-center gap-2">
    <ExternalLogo provider={contemporary.label.toLowerCase()} />
    {properCase(contemporary.label)}</td
  >
  {#if additionalProperties}
    {#each additionalProperties as property}
      <td class="border border-bgs3 p-2">
        {contemporaryDetail[property]}
      </td>
    {/each}
  {/if}
  <td class="border border-bgs3 p-2">
    <RatingCell value={contemporary.value} />
  </td>
  <td class="border border-bgs3 p-2">
    <NotesCell notes={contemporary.notes} />
  </td>
</tr>
