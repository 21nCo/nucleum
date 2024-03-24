<script lang="ts">
  import SubAtomLogo from "$lib/tidy/branding/SubAtomLogo.svelte";
  import {
    FeatureWheelMode,
    type FeatureWheelGroup,
    type FeatureWheelSpoke,
    type FeatureWheel
  } from "$lib/tidy/types/featureWheel.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import SpokeLabel from "./SpokeLabel.svelte";
  import SpokeProgressMarker from "./SpokeProgressMarker.svelte";
  import SpokeContemporaries from "./contemporaries/SpokeContemporaries.svelte";
  export let wheel: FeatureWheel;
  export let mode: FeatureWheelMode = FeatureWheelMode.CONTEMPORARY;
  let features: FeatureWheelGroup[] = wheel.features;
  let categoryColoringStyle: "bg" | "spoke" =
    mode === FeatureWheelMode.PROGRESS || mode === FeatureWheelMode.CONTEMPORARY
      ? "spoke"
      : "bg";
  let radius = 245;
  const emptyDividerSpoke: FeatureWheelSpoke = {
    label: "",
    contemporaries: [],
    isDivider: true
  };
  if (categoryColoringStyle === "bg") {
    features = features.map((group) => {
      group.spokes = [emptyDividerSpoke, ...group.spokes];
      return group;
    });
  }
  let groupCount = features.length;
  //   let angle = (2 * Math.PI) / groupCount;
  //   let spokeAngle = angle / 3;

  // Calculate the total number of spokes
  let totalSpokes = features.reduce(
    (total, group) => total + group.spokes.length,
    0
  );

  // Initialize startAngles with the start angle for the first group
  let startAngles = [0];

  // Fill in the start angles for the rest of the groups
  for (let i = 1; i < features.length; i++) {
    startAngles[i] =
      startAngles[i - 1] +
      (2 * Math.PI * features[i - 1].spokes.length) / totalSpokes;
  }

  // Calculate the angle for each group
  let groupAngles = features.map(
    (group) => (2 * Math.PI * group.spokes.length) / totalSpokes
  );
  let size = totalSpokes > 10 ? Size.xs : Size.md;
</script>

<svg class="wheel" viewBox="-300 -300 600 600">
  {#each features as group, i (group.label)}
    {#if categoryColoringStyle === "bg"}
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
        class="fill-none stroke-fgs2"
        stroke-width="2"
      />
    {/if}

    <text
      x={(radius + groupAngles[i] * 120) *
        Math.cos(startAngles[i] + groupAngles[i] / 2)}
      y={(radius + 60) * Math.sin(startAngles[i] + groupAngles[i] / 2)}
      text-anchor="middle"
      dominant-baseline="middle"
      class="text-b1 font-bold"
      fill={group.color}
    >
      {group.label}
    </text>

    {#each group.spokes as spoke, j (spoke.label)}
      <line
        x1="0"
        y1="0"
        x2={radius *
          Math.cos(startAngles[i] + (j / group.spokes.length) * groupAngles[i])}
        y2={radius *
          Math.sin(startAngles[i] + (j / group.spokes.length) * groupAngles[i])}
        class={spoke.isDivider
          ? "stroke-fgs3"
          : !group.color
            ? "stroke-fgs2"
            : categoryColoringStyle === "bg"
              ? "stroke-bgs2"
              : ""}
        stroke={group.color && categoryColoringStyle === "spoke"
          ? `${group.color}`
          : ""}
        stroke-width={mode === FeatureWheelMode.CONTEMPORARY ? 1 : 1.5}
        stroke-dasharray={spoke.isDivider ? "4 2" : ""}
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
              ) +
              8}
            yCoord={radius *
              (1 - (contemporary.value ?? 0)) *
              Math.sin(
                startAngles[i] + (j / group.spokes.length) * groupAngles[i]
              ) +
              8}
            {contemporary}
          />
        {/each}
      {/if}
      <SpokeLabel
        {size}
        {spoke}
        xCoord={(radius + groupAngles[i] * 40) *
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
    width: 95vw;
    height: 80vh;
    margin: auto;
  }
</style>
