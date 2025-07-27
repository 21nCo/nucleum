<script lang="ts">
  import RatingCell from "./RatingCell.svelte";
  import NotesCell from "./NotesCell.svelte";
  import ExternalLogo from "$lib/client/branding/external/ExternalLogo.svelte";
  import { properCase } from "$lib/shared/utils/text.utils";
  import {
    type IContemporary,
    type IFeatureWheelContemporary
  } from "$lib/client/types/featureWheel.type";
  import { mapValue } from "./table.utils";
  export let contemporary: IFeatureWheelContemporary;
  export let contemporaryDetail: IContemporary;
  export let additionalProperties: string[] = [];
</script>

<tr>
  <td class="border-b border-l border-brs3 p-2 flex items-center gap-2">
    {#if contemporaryDetail.icon}
      <ExternalLogo provider={contemporaryDetail.icon} />
    {/if}
    {properCase(contemporary.label)}</td
  >
  {#if additionalProperties}
    {#each additionalProperties as property}
      <td class="border border-brs3 p-2">
        {mapValue(property, contemporaryDetail[property])}
      </td>
    {/each}
  {/if}
  <td class="border border-brs3 p-2">
    {contemporaryDetail.price ? `$${contemporaryDetail.price}` : "-"}
  </td>
  <td class="border border-brs3 p-2">
    <RatingCell value={contemporary.value} />
  </td>
  <td class="border border-brs3 p-2">
    <NotesCell notes={contemporary.notes} contemporary={contemporaryDetail} />
  </td>
</tr>
