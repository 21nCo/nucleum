<script lang="ts">
  import RatingCell from "@21n/components/featureWheel/sidePanel/comparisionTable/RatingCell.svelte";
  import NotesCell from "@21n/components/featureWheel/sidePanel/comparisionTable/NotesCell.svelte";
  import ExternalLogo from "@21n/branding/external/ExternalLogo.svelte";
  import { properCase } from "@21n/shared-utils/text.utils";
  import {
    type IContemporary,
    type IFeatureWheelContemporary,
    type IFwFeature
  } from "@21n/types/featureWheel.type";
  import { mapValue } from "@21n/components/featureWheel/sidePanel/comparisionTable/table.utils";

  let {
    contemporary,
    feature,
    contemporaryDetail = undefined,
    additionalProperties = []
  }: {
    contemporary: IFeatureWheelContemporary;
    feature: IFwFeature;
    contemporaryDetail?: IContemporary;
    additionalProperties?: string[];
  } = $props();

  function resolveAdditionalProperty(property: string) {
    const key = property as keyof IContemporary;
    return contemporaryDetail?.[key];
  }
</script>

<tr>
  <td class="border-b border-l border-brs3 p-2 flex items-center gap-2">
    {#if contemporaryDetail}
      <div class="w-5 h-5">
        <ExternalLogo provider={contemporaryDetail} url={contemporaryDetail.url} />
      </div>
    {/if}
    {properCase(contemporary.label)}</td
  >
  {#if additionalProperties}
    {#each additionalProperties as property}
      <td class="border border-brs3 p-2">
        {mapValue(property, resolveAdditionalProperty(property))}
      </td>
    {/each}
  {/if}
  <td class="border border-brs3 p-2">
    {contemporaryDetail?.price ? `$${contemporaryDetail.price}` : "-"}
  </td>
  <td class="border border-brs3 p-2">
    <RatingCell value={contemporary.value} />
  </td>
  <td class="border border-brs3 p-2">
    <NotesCell
      {feature}
      notes={contemporary.notes}
      contemporary={contemporaryDetail}
    />
  </td>
</tr>
