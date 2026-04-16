<script lang="ts">
  import SubAtomLogo from "@21n/branding/SubAtomLogo.svelte";
  import {
    FeatureWheelMode,
    type IFeatureWheelGroup,
    type IFeatureWheelSpoke,
    type IFeatureWheel,
    type IFeatureWheelContemporary
  } from "@21n/types/featureWheel.type";
  import { Size } from "@21n/types/size.enum";
  import SpokeLabel from "@21n/components/featureWheel/labels/SpokeLabel.svelte";
  import SpokeProgressMarker from "@21n/components/featureWheel/SpokeProgressMarker.svelte";
  import SpokeContemporaries from "@21n/components/featureWheel/contemporaries/SpokeContemporaries.svelte";
  import { deepCopy } from "@21n/shared-utils/obj.utils";
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import { resizeListener } from "@21n/actions/resize.action";
  let {
    wheel,
    mode = FeatureWheelMode.COMPARER,
    selectedSpoke = "",
    onSpokeClick = (_detail: { spoke: string; group: string }) => {},
    onContemporary = (
      _detail: {
        spoke: string;
        contemporaries: IFeatureWheelContemporary | IFeatureWheelContemporary[];
      }
    ) => {}
  }: {
    wheel: IFeatureWheel;
    mode?: FeatureWheelMode;
    selectedSpoke?: string;
    onSpokeClick?: (detail: { spoke: string; group: string }) => void;
    onContemporary?: (detail: {
      spoke: string;
      contemporaries: IFeatureWheelContemporary | IFeatureWheelContemporary[];
    }) => void;
  } = $props();
  let groups: IFeatureWheelGroup[] = $state([]);
  let categoryColoringStyle: "bg" | "spoke" = $state("bg");
  let groupInFocus = $state("");
  let svgWidth = $state(0);

  let radius = 220;
  const emptyDividerSpoke: IFeatureWheelSpoke = {
    label: "",
    contemporaries: [],
    isDivider: true
  };

  let startAngles: number[] = $state([0]);
  let groupAngles: number[] = $state([]);
  let spokeLabelXDisplacementFactor = 10;

  let innerRadiusFactor = 0.4;
  let middleRadiusFactor = 0.8;

  let innerRadius = $state(radius * innerRadiusFactor);
  let middleRadius = $state(radius * middleRadiusFactor);
  const size = $derived(svgWidth < 1000 ? Size.md : Size.sm);

  $effect(() => {
    mode;
    wheel;
    groupInFocus;
    refresh(mode, wheel);
  });

  function refresh(mode: FeatureWheelMode, wheel: IFeatureWheel) {
    let nextGroups = deepCopy(wheel.groups);
    if (groupInFocus) {
      nextGroups = nextGroups.filter(
        (group: IFeatureWheelGroup) => group.label === groupInFocus
      );
    }
    categoryColoringStyle =
      mode === FeatureWheelMode.PROGRESS || mode === FeatureWheelMode.COMPARER
        ? "spoke"
        : "bg";
    if (categoryColoringStyle === "bg" && nextGroups.length > 1) {
      nextGroups = nextGroups.map((group: IFeatureWheelGroup) => {
        if (group.spokes.length > 0 && !group.spokes[0].isDivider)
          group.spokes = [emptyDividerSpoke, ...group.spokes];
        return group;
      });
    } else {
      nextGroups = nextGroups.map((group: IFeatureWheelGroup) => {
        group.spokes = group.spokes.filter(
          (spoke: IFeatureWheelSpoke) => !spoke.isDivider
        );
        return group;
      });
    }
    let totalSpokes = nextGroups.reduce(
      (total: number, group: IFeatureWheelGroup) => total + group.spokes.length,
      0
    );
    let limitingSpokeCount =
      totalSpokes >= 30 ? 3 : totalSpokes >= 20 ? 4 : totalSpokes > 10 ? 5 : 20;
    if (totalSpokes > limitingSpokeCount && nextGroups.length > 1) {
      nextGroups = nextGroups.map((group: IFeatureWheelGroup) => {
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
      totalSpokes = nextGroups.reduce(
        (total: number, group: IFeatureWheelGroup) =>
          total + group.spokes.length,
        0
      );
    }

    const nextStartAngles = [0];
    for (let i = 1; i < nextGroups.length; i++) {
      nextStartAngles[i] =
        nextStartAngles[i - 1] +
        (2 * Math.PI * nextGroups[i - 1].spokes.length) / totalSpokes;
    }

    groups = nextGroups;
    startAngles = nextStartAngles;
    groupAngles = nextGroups.map(
      (group: IFeatureWheelGroup) =>
        (2 * Math.PI * group.spokes.length) / totalSpokes
    );
    radius = totalSpokes > 1 ? 220 : 180;
    innerRadius = radius * innerRadiusFactor;
    middleRadius = radius * middleRadiusFactor;
    spokeLabelXDisplacementFactor = totalSpokes * 0.3;
  }
</script>

{#if groups && groups.length > 0}
  <svg
    class="wheel"
    viewBox="-250 -250 500 500"
    use:resizeListener={(e) => {
      svgWidth = e.width;
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
      {#each group.spokes as spoke, j (spoke.label)}
        {@const isActive =
          selectedSpoke?.toLowerCase() === spoke.label.toLowerCase()}
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
            : isActive
              ? ""
              : selectedSpoke !== "howToUse" && selectedSpoke
                ? "stroke-bgs4"
                : !group.color || mode === FeatureWheelMode.COMPARER
                  ? "stroke-fgs4"
                  : categoryColoringStyle === "bg"
                    ? "stroke-bgs2"
                    : ""}
          stroke={group.color &&
          ((categoryColoringStyle === "spoke" &&
            mode !== FeatureWheelMode.COMPARER) ||
            isActive)
            ? `${group.color}`
            : ""}
          stroke-width={mode !== FeatureWheelMode.COMPARER || isActive
            ? 0.8
            : 0.3}
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
            {selectedSpoke}
            onContemporary={(detail) => {
              onContemporary({
                spoke: spoke.label,
                contemporaries: detail
              });
            }}
          />
        {/if}
        <SpokeLabel
          {mode}
          {size}
          {spoke}
          groupColor={group.color}
          {isActive}
          onclick={() => {
            onSpokeClick({ spoke: spoke.label, group: group.label });
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
