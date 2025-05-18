<script lang="ts">
  import type {
    IFeatureWheelContemporary,
    IFeatureWheelSpoke
  } from "$lib/client/types/featureWheel.type";
  import type { Size } from "$lib/client/types/size.enum";
  import SpokeContemporaryItem from "./SpokeContemporaryItem.svelte";
  export let size: Size;
  export let spoke: IFeatureWheelSpoke;
  export let contemporaries: IFeatureWheelContemporary[];
  export let radius: number;
  export let startAngles: number[];
  export let groupAngles: number[];
  export let i: number;
  export let j: number;
  export let groupSpokeLength: number;
  // Group contemporaries by their value
  $: contemporaryGroups = contemporaries.reduce((groups, contemporary) => {
    const value = contemporary.value;
    const existingGroup = groups.find((g) => g[0].value === value);
    if (existingGroup) {
      existingGroup.push(contemporary);
    } else {
      groups.push([contemporary]);
    }
    return groups;
  }, [] as IFeatureWheelContemporary[][]);

  // Single contemporaries are those that have unique values
  $: singleContemporaries = contemporaryGroups
    .filter((group) => group.length === 1)
    .map((group) => group[0]);

  // Groups are those with multiple contemporaries sharing same value
  $: groupedContemporaries = contemporaryGroups.filter(
    (group) => group.length > 1
  );

  function resolveYCoord(contemporary: IFeatureWheelContemporary) {
    return (
      radius *
      (1 - (contemporary.value ?? 0)) *
      Math.sin(startAngles[i] + (j / groupSpokeLength) * groupAngles[i])
    );
  }

  function resolveXCoord(contemporary: IFeatureWheelContemporary) {
    return (
      radius *
      (1 - (contemporary.value ?? 0)) *
      Math.cos(startAngles[i] + (j / groupSpokeLength) * groupAngles[i])
    );
  }
</script>

{#each singleContemporaries as contemporary}
  <SpokeContemporaryItem
    {size}
    on:contemporary
    xCoord={resolveXCoord(contemporary)}
    yCoord={resolveYCoord(contemporary)}
    {contemporary}
  />
{/each}
{#each groupedContemporaries as contemporary}
  <SpokeContemporaryItem
    {size}
    on:contemporary
    xCoord={resolveXCoord(contemporary[0])}
    yCoord={resolveYCoord(contemporary[0])}
    group={contemporary}
  />
{/each}
