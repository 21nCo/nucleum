<script lang="ts">
  import SubAtomLogo from "$lib/tidy/branding/SubAtomLogo.svelte";
  import {
    FeatureWheelMode,
    type FeatureWheelGroup,
    type FeatureWheelSpoke
  } from "$lib/tidy/types/featureWheel.type";
  import { memotronWheel } from "./memotronWheel";
  export let wheel: FeatureWheelGroup[] = [];
  export let mode: FeatureWheelMode = FeatureWheelMode.PROGRESS;
  let categoryColoringStyle: "bg" | "spoke" =
    mode === FeatureWheelMode.PROGRESS ? "spoke" : "bg";
  let radius = 260;

  wheel = memotronWheel;
  const emptyDividerSpoke: FeatureWheelSpoke = {
    label: "",
    contemporaries: [],
    isDivider: true
  };
  if (categoryColoringStyle === "bg") {
    wheel = wheel.map((group) => {
      group.spokes = [emptyDividerSpoke, ...group.spokes];
      return group;
    });
  }
  let groupCount = wheel.length;
  //   let angle = (2 * Math.PI) / groupCount;
  //   let spokeAngle = angle / 3;

  // Calculate the total number of spokes
  let totalSpokes = wheel.reduce(
    (total, group) => total + group.spokes.length,
    0
  );

  // Initialize startAngles with the start angle for the first group
  let startAngles = [0];

  // Fill in the start angles for the rest of the groups
  for (let i = 1; i < wheel.length; i++) {
    startAngles[i] =
      startAngles[i - 1] +
      (2 * Math.PI * wheel[i - 1].spokes.length) / totalSpokes;
  }

  // Calculate the angle for each group
  let groupAngles = wheel.map(
    (group) => (2 * Math.PI * group.spokes.length) / totalSpokes
  );
</script>

<svg class="wheel" viewBox="-300 -300 600 600">
  {#each wheel as group, i (group.label)}
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
        class={!group.color || spoke.isDivider
          ? "stroke-fgs2"
          : categoryColoringStyle === "bg"
            ? "stroke-bgs2"
            : ""}
        stroke={group.color && categoryColoringStyle === "spoke"
          ? `${group.color}`
          : ""}
        stroke-width="1.5"
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
        <rect
          x={radius *
            (1 - (spoke.progress ?? 0)) *
            Math.cos(
              startAngles[i] + (j / group.spokes.length) * groupAngles[i]
            ) -
            2}
          y={radius *
            (1 - (spoke.progress ?? 0)) *
            Math.sin(
              startAngles[i] + (j / group.spokes.length) * groupAngles[i]
            ) -
            2}
          width="20"
          height="20"
          class="fill-bgs1"
        />
        <text
          x={radius *
            (1 - (spoke.progress ?? 0)) *
            Math.cos(
              startAngles[i] + (j / group.spokes.length) * groupAngles[i]
            ) +
            8}
          y={radius *
            (1 - (spoke.progress ?? 0)) *
            Math.sin(
              startAngles[i] + (j / group.spokes.length) * groupAngles[i]
            ) +
            8}
          text-anchor="middle"
          dominant-baseline="middle"
          class="text-b5 bg-bgs2"
        >
          {Math.round((spoke.progress ?? 0) * 100)}%
        </text>
      {/if}
      {#if spoke.isProminent || spoke.isNovel}
        <rect
          x={(radius + groupAngles[i] * 40) *
            Math.cos(
              startAngles[i] + (j / group.spokes.length) * groupAngles[i]
            ) -
            spoke.label.length * 3.5}
          y={(radius + 20) *
            Math.sin(
              startAngles[i] + (j / group.spokes.length) * groupAngles[i]
            ) -
            13}
          width={spoke.label.length * 7}
          height="25"
          class="{spoke.isNovel
            ? 'fill-ags1'
            : 'fill-bgs1'} stroke-aps1 rounded-md"
        />
      {/if}
      <text
        x={(radius + groupAngles[i] * 40) *
          Math.cos(startAngles[i] + (j / group.spokes.length) * groupAngles[i])}
        y={(radius + 20) *
          Math.sin(startAngles[i] + (j / group.spokes.length) * groupAngles[i])}
        text-anchor="middle"
        dominant-baseline="middle"
        class="text-b4"
      >
        {spoke.label}
      </text>
    {/each}
  {/each}
  <foreignObject x="-35" y="-35" class="w-16 h-[3.5rem] bg-bgs1 rounded-full">
    <SubAtomLogo />
  </foreignObject>
</svg>

<style>
  .wheel {
    width: 100%;
    height: 100%;
    max-width: 1450px;
    max-height: 750px;
    margin: auto;
  }
</style>
