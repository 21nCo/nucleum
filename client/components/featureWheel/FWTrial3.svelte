<script lang="ts">
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  import {
    FeatureWheelMode,
    type FeatureWheelGroup,
    type FeatureWheelSpoke,
    type FeatureWheel
  } from "$lib/client/types/featureWheel.type";
  import { Size } from "$lib/client/types/size.enum";
  import SpokeLabel from "./SpokeLabel.svelte";
  import SpokeProgressMarker from "./SpokeProgressMarker.svelte";
  import SpokeContemporaries from "./contemporaries/SpokeContemporaries.svelte";
  import { deepCopy } from "$lib/client/utils/obj.utils";
  import GroupLabel from "./GroupLabel.svelte";
  export let wheel: FeatureWheel;
  export let mode: FeatureWheelMode = FeatureWheelMode.CONTEMPORARY;
  let groups: FeatureWheelGroup[];
  let categoryColoringStyle: "bg" | "spoke";
  let groupInFocus: string = "";

  $: refresh(mode, wheel);

  let radius = 220;
  const emptyDividerSpoke: FeatureWheelSpoke = {
    label: "",
    contemporaries: [],
    isDivider: true
  };

  let startAngles = [0];
  let groupAngles: number[];
  let size: Size;
  let spokeLabelXDisplacementFactor = 10;

  function refresh(mode: FeatureWheelMode, wheel: FeatureWheel) {
    groups = deepCopy(wheel.groups);
    if (groupInFocus) {
      groups = groups.filter((group) => group.label === groupInFocus);
    }
    console.log("groups", groups);
    categoryColoringStyle =
      mode === FeatureWheelMode.PROGRESS ||
      mode === FeatureWheelMode.CONTEMPORARY
        ? "spoke"
        : "bg";
    if (categoryColoringStyle === "bg" && groups.length > 1) {
      groups = groups.map((group) => {
        if (group.spokes.length > 0 && !group.spokes[0].isDivider)
          group.spokes = [emptyDividerSpoke, ...group.spokes];
        return group;
      });
    } else {
      groups = groups.map((group) => {
        group.spokes = group.spokes.filter((spoke) => !spoke.isDivider);
        return group;
      });
    }

    let groupCount = groups.length;
    //   let angle = (2 * Math.PI) / groupCount;
    //   let spokeAngle = angle / 3;

    let totalSpokes = groups.reduce(
      (total, group) => total + group.spokes.length,
      0
    );
    let limitingSpokeCount =
      totalSpokes >= 30 ? 4 : totalSpokes >= 20 ? 5 : totalSpokes > 10 ? 6 : 8;
    if (totalSpokes > limitingSpokeCount && groups.length > 1) {
      groups = groups.map((group) => {
        if (group.spokes.length > limitingSpokeCount) {
          const remainingCount = group.spokes.length - limitingSpokeCount;
          group.spokes = group.spokes.slice(0, limitingSpokeCount);
          group.spokes.push({
            label: "+" + remainingCount + " more",
            contemporaries: []
          });
        }
        return group;
      });
      totalSpokes = groups.reduce(
        (total, group) => total + group.spokes.length,
        0
      );
    }

    for (let i = 1; i < groups.length; i++) {
      startAngles[i] =
        startAngles[i - 1] +
        (2 * Math.PI * groups[i - 1].spokes.length) / totalSpokes;
    }

    groupAngles = groups.map(
      (group) => (2 * Math.PI * group.spokes.length) / totalSpokes
    );
    size = totalSpokes > 10 ? Size.sm : Size.md;
    radius = totalSpokes > 10 ? 220 : 180;
    spokeLabelXDisplacementFactor = totalSpokes * 1.3;
    console.log({
      totalSpokes,
      startAngles,
      groupAngles,
      size,
      radius,
      groups
    });
  }

  function toggleGroupFocus(group: string) {
    groupInFocus = groupInFocus === group ? "" : group;
    // console.log("groupInFocus", { groupInFocus });
    refresh(mode, wheel);
  }
</script>

<svg class="wheel" viewBox="-300 -300 600 600">
  {#each groups as group, i (group.label)}
    {#if categoryColoringStyle === "bg" && groups.length > 1}
      <path
        d={`M 0 0 L ${radius * Math.cos(startAngles[i])} ${
          radius * Math.sin(startAngles[i])
        } A ${radius} ${radius} 0 0 1 ${
          radius * Math.cos(startAngles[i] + groupAngles[i])
        } ${radius * Math.sin(startAngles[i] + groupAngles[i])} Z`}
        fill={group.color}
        class="{!group.color ? 'fill-bgs2' : ''} stroke-fgs2 stroke-width-2"
      />
    {:else}
      <circle
        cx="0"
        cy="0"
        r={radius}
        class={categoryColoringStyle != "bg"
          ? "stroke-fgs2 fill-none"
          : "stroke-fgs3"}
        stroke-width="2"
        fill={categoryColoringStyle === "bg" && groups.length === 1
          ? group.color
          : ""}
      />
    {/if}
    <GroupLabel
      label={group.label}
      color={group.color}
      xCoord={groups.length > 1
        ? (radius + groupAngles[i] * 140) *
          Math.cos(startAngles[i] + groupAngles[i] / 2)
        : 0}
      yCoord={groups.length > 1
        ? (radius + 60) * Math.sin(startAngles[i] + groupAngles[i] / 2)
        : radius + 60}
      on:click={() => {
        toggleGroupFocus(group.label);
      }}
    />
    {#each group.spokes as spoke, j (spoke.label)}
      <line
        x1="0"
        y1="0"
        x2={radius *
          Math.cos(startAngles[i] + (j / group.spokes.length) * groupAngles[i])}
        y2={radius *
          Math.sin(startAngles[i] + (j / group.spokes.length) * groupAngles[i])}
        class={spoke.isDivider
          ? "stroke-bgs1"
          : !group.color
            ? "stroke-fgs2"
            : categoryColoringStyle === "bg"
              ? "stroke-bgs2"
              : ""}
        stroke={group.color && categoryColoringStyle === "spoke"
          ? `${group.color}`
          : ""}
        stroke-width={mode === FeatureWheelMode.CONTEMPORARY ? 0.6 : 0.8}
        stroke-dasharray={spoke.isDivider ? "6 6" : ""}
        shape-rendering="geometricPrecision"
      />
      {#if mode === FeatureWheelMode.PROGRESS}
        <line
          x1="0"
          y1="0"
          x2={radius *
            (1 - (spoke.progress ?? 0)) *
            Math.cos(
              startAngles[i] + (j / group.spokes.length) * groupAngles[i]
            )}
          y2={radius *
            (1 - (spoke.progress ?? 0)) *
            Math.sin(
              startAngles[i] + (j / group.spokes.length) * groupAngles[i]
            )}
          class="stroke-bgs2"
          stroke-width="1.5"
        />
        {#if spoke.progress && spoke.progress != 1}
          <SpokeProgressMarker
            {size}
            xCoord={radius *
              (1 - (spoke.progress ?? 0)) *
              Math.cos(
                startAngles[i] + (j / group.spokes.length) * groupAngles[i]
              )}
            yCoord={radius *
              (1 - (spoke.progress ?? 0)) *
              Math.sin(
                startAngles[i] + (j / group.spokes.length) * groupAngles[i]
              )}
            progress={spoke.progress}
          />
        {/if}
      {:else if mode === FeatureWheelMode.CONTEMPORARY && spoke.contemporaries.length > 0}
        {#each spoke.contemporaries as contemporary}
          <SpokeContemporaries
            xCoord={radius *
              (1 - (contemporary.value ?? 0)) *
              Math.cos(
                startAngles[i] + (j / group.spokes.length) * groupAngles[i]
              )}
            yCoord={radius *
              (1 - (contemporary.value ?? 0)) *
              Math.sin(
                startAngles[i] + (j / group.spokes.length) * groupAngles[i]
              )}
            {contemporary}
          />
        {/each}
      {/if}
      <SpokeLabel
        {size}
        {spoke}
        xCoord={(radius + groupAngles[i] * spokeLabelXDisplacementFactor) *
          Math.cos(startAngles[i] + (j / group.spokes.length) * groupAngles[i])}
        yCoord={(radius + 20) *
          Math.sin(startAngles[i] + (j / group.spokes.length) * groupAngles[i])}
      />
    {/each}
  {/each}
  <foreignObject x="-20" y="-22" class="w-[2.5rem] h-[2.5rem]">
    <div
      class="bg-bgs1 w-full h-full flex justify-center items-center rounded-full"
    >
      <SubAtomLogo subatom={wheel.product} />
      <!-- <div class="hover:text-b3 text-aps1">something</div> -->
    </div>
  </foreignObject>
</svg>

<style>
  .wheel {
    /* width: 100%;
    height: 100%;
    max-width: 1450px;
    max-height: 750px; */
    width: 100%;
    height: 100%;
    margin: auto;
  }
</style>
