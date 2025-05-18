<script lang="ts">
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  import {
    FeatureWheelMode,
    type IFeatureWheelGroup,
    type IFeatureWheelSpoke,
    type IFeatureWheel
  } from "$lib/client/types/featureWheel.type";
  import { Size } from "$lib/client/types/size.enum";
  import SpokeLabel from "../labels/SpokeLabel.svelte";
  import SpokeProgressMarker from "../SpokeProgressMarker.svelte";
  import SpokeContemporaries from "../contemporaries/SpokeContemporaries.svelte";
  import { deepCopy } from "$lib/shared/utils/obj.utils";
  import GroupLabel from "../labels/GroupLabel.svelte";
  import { onMount } from "svelte";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { createEventDispatcher } from "svelte";
  import { resizeListener } from "$lib/client/actions/resize.action";
  const dispatch = createEventDispatcher();
  export let wheel: IFeatureWheel;
  export let mode: FeatureWheelMode = FeatureWheelMode.COMPARER;
  export let selectedSpoke: string = "";
  let groups: IFeatureWheelGroup[];
  let categoryColoringStyle: "bg" | "spoke";
  let groupInFocus: string = "";
  let svgWidth: number;
  onMount(() => {
    refresh(mode, wheel);
  });

  let radius = 220;
  const emptyDividerSpoke: IFeatureWheelSpoke = {
    label: "",
    contemporaries: [],
    isDivider: true
  };

  let startAngles = [0];
  let groupAngles: number[];
  let spokeLabelXDisplacementFactor = 10;

  let innerRadiusFactor = 0.4;
  let middleRadiusFactor = 0.8;

  let innerRadius = radius * innerRadiusFactor;
  let middleRadius = radius * middleRadiusFactor;
  $: size = svgWidth < 1000 ? Size.md : Size.sm;

  function refresh(mode: FeatureWheelMode, wheel: IFeatureWheel) {
    groups = deepCopy(wheel.groups);
    if (groupInFocus) {
      groups = groups.filter((group) => group.label === groupInFocus);
    }
    console.log("groups", groups);
    categoryColoringStyle =
      mode === FeatureWheelMode.PROGRESS || mode === FeatureWheelMode.COMPARER
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
    radius = totalSpokes > 1 ? 220 : 180;
    innerRadius = radius * innerRadiusFactor;
    middleRadius = radius * middleRadiusFactor;
    // spokeLabelXDisplacementFactor = totalSpokes * 1.3;
  }

  function toggleGroupFocus(group: string) {
    groupInFocus = groupInFocus === group ? "" : group;
    // console.log("groupInFocus", { groupInFocus });
    refresh(mode, wheel);
  }
</script>

{#if groups && groups.length > 0}
  <svg
    class="wheel"
    viewBox="-250 -250 500 500"
    use:resizeListener={(e) => {
      svgWidth = e.width;
      console.log({ svgWidth });
    }}
  >
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
            ? "stroke-fgs3 fill-none"
            : "stroke-fgs3"}
          stroke-width="0.3"
          stroke-dasharray={mode === FeatureWheelMode.COMPARER ? "3 3" : ""}
          fill={categoryColoringStyle === "bg" && groups.length === 1
            ? group.color
            : ""}
        />
      {/if}
      <!-- <GroupLabel
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
    /> -->
      {#each group.spokes as spoke, j (spoke.label)}
        <line
          x1="0"
          y1="0"
          x2={radius *
            Math.cos(
              startAngles[i] + (j / group.spokes.length) * groupAngles[i]
            )}
          y2={radius *
            Math.sin(
              startAngles[i] + (j / group.spokes.length) * groupAngles[i]
            )}
          class={spoke.isDivider
            ? "stroke-bgs1"
            : !group.color || mode === FeatureWheelMode.COMPARER
              ? "stroke-fgs3"
              : categoryColoringStyle === "bg"
                ? "stroke-bgs2"
                : ""}
          stroke={group.color &&
          categoryColoringStyle === "spoke" &&
          mode !== FeatureWheelMode.COMPARER
            ? `${group.color}`
            : ""}
          stroke-width={mode === FeatureWheelMode.COMPARER ? 0.3 : 0.8}
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
        {:else if mode === FeatureWheelMode.COMPARER && spoke.contemporaries.length > 0}
          <SpokeContemporaries
            {size}
            {spoke}
            contemporaries={spoke.contemporaries}
            {radius}
            {startAngles}
            {groupAngles}
            {i}
            {j}
            groupSpokeLength={group.spokes.length}
            on:contemporary={(e) => {
              dispatch("contemporary", {
                spoke: spoke.label,
                contemporaries: e.detail
              });
            }}
          />
        {/if}
        <SpokeLabel
          {mode}
          {size}
          {spoke}
          groupColor={group.color}
          isActive={selectedSpoke?.toLowerCase() === spoke.label.toLowerCase()}
          on:click={() => {
            dispatch("spokeClick", spoke.label);
          }}
          xCoord={(radius + groupAngles[i] * spokeLabelXDisplacementFactor) *
            Math.cos(
              startAngles[i] + (j / group.spokes.length) * groupAngles[i]
            )}
          yCoord={(radius + 20) *
            Math.sin(
              startAngles[i] + (j / group.spokes.length) * groupAngles[i]
            )}
        />
      {/each}
    {/each}
    <foreignObject x="-10" y="-12" class="w-[1.2rem] h-[1.2rem]">
      <div
        class="bg-bgs1 w-full h-full flex justify-center items-center rounded-full"
      >
        <SvgIcon icon={wheel.product} isRenderRaw={true} />
      </div>
    </foreignObject>
    {#if mode === FeatureWheelMode.COMPARER}
      {@const textSize = size === Size.sm ? 8 : size === Size.md ? 10 : 12}
      <!-- <circle
      cx="0"
      cy="0"
      r={radius}
      class="stroke-fgs2 fill-none opacity-70"
      stroke-width="0.5"
    /> -->
      <circle
        cx="0"
        cy="0"
        r={middleRadius}
        class="stroke-yellow-500 fill-none opacity-70"
        stroke-width="0.5"
      />
      <circle
        cx="0"
        cy="0"
        r={innerRadius}
        class="stroke-ags1 fill-none opacity-70"
        stroke-width="0.5"
      />

      <!-- Rating labels -->
      <text
        x="0"
        y={innerRadius - 6}
        text-anchor="middle"
        class={`text-[${textSize}px] fill-fgs4`}>💚</text
      >
      <text
        x="0"
        y={middleRadius - 6}
        text-anchor="middle"
        class={`text-[${textSize}px] fill-yellow-500`}>👍 Okay</text
      >
      <text
        x="0"
        y={radius - 6}
        text-anchor="middle"
        class={`text-[${textSize}px] fill-ars1`}>Negative</text
      >
    {/if}
  </svg>
{/if}

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
