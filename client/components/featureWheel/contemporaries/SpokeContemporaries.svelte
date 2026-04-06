<script lang="ts">
  import type {
    IFeatureWheelContemporary,
    IFeatureWheelSpoke
  } from "@21n/types/featureWheel.type";
  import type { Size } from "@21n/types/size.enum";
  import SpokeContemporaryItem from "@21n/components/featureWheel/contemporaries/SpokeContemporaryItem.svelte";
  let {
    size,
    selectedSpoke = undefined,
    spoke,
    contemporaries,
    radius,
    startAngles,
    groupAngles,
    i,
    j,
    groupSpokeLength,
    onContemporary = (
      _value: IFeatureWheelContemporary | IFeatureWheelContemporary[]
    ) => {}
  }: {
    size: Size;
    selectedSpoke?: string | undefined;
    spoke: IFeatureWheelSpoke;
    contemporaries: IFeatureWheelContemporary[];
    radius: number;
    startAngles: number[];
    groupAngles: number[];
    i: number;
    j: number;
    groupSpokeLength: number;
    onContemporary?: (
      value: IFeatureWheelContemporary | IFeatureWheelContemporary[]
    ) => void;
  } = $props();
  const contemporaryGroups = $derived.by(() =>
    contemporaries.reduce((groups, contemporary) => {
      const value = contemporary.value;
      const existingGroup = groups.find((g) => g[0].value === value);
      if (existingGroup) {
        existingGroup.push(contemporary);
      } else {
        groups.push([contemporary]);
      }
      return groups;
    }, [] as IFeatureWheelContemporary[][])
  );
  const singleContemporaries = $derived(
    contemporaryGroups
      .filter((group) => group.length === 1)
      .map((group) => group[0])
  );
  const groupedContemporaries = $derived(
    contemporaryGroups.filter((group) => group.length > 1)
  );

  function resolveYCoord(contemporary: IFeatureWheelContemporary) {
    return (
      radius *
      (1 - (contemporary.value ? contemporary.value : 0.03)) *
      Math.sin(startAngles[i] + (j / groupSpokeLength) * groupAngles[i])
    );
  }

  function resolveXCoord(contemporary: IFeatureWheelContemporary) {
    return (
      radius *
      (1 - (contemporary.value ? contemporary.value : 0.03)) *
      Math.cos(startAngles[i] + (j / groupSpokeLength) * groupAngles[i])
    );
  }
</script>

{#if !selectedSpoke || selectedSpoke === "howToUse" || selectedSpoke?.toLowerCase() === spoke.label.toLowerCase()}
  {#each singleContemporaries as contemporary}
    <SpokeContemporaryItem
      {size}
      {onContemporary}
      xCoord={resolveXCoord(contemporary)}
      yCoord={resolveYCoord(contemporary)}
      {contemporary}
    />
  {/each}
  {#each groupedContemporaries as contemporary}
    <SpokeContemporaryItem
      {size}
      {onContemporary}
      xCoord={resolveXCoord(contemporary[0])}
      yCoord={resolveYCoord(contemporary[0])}
      group={contemporary}
    />
  {/each}
{/if}
