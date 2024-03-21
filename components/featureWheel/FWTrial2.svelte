<script lang="ts">
  import SubAtomLogo from "$lib/tidy/branding/SubAtomLogo.svelte";
  import {
    FeatureWheelMode,
    type FeatureWheelGroup,
    type FeatureWheelSpoke
  } from "$lib/tidy/types/featureWheel.type";
  export let mode: FeatureWheelMode = FeatureWheelMode.DEFAULT;
  let categoryColoringStyle: "bg" | "spoke" =
    mode === FeatureWheelMode.PROGRESS ? "spoke" : "bg";
  let radius = 270;
  let spokesTwo: FeatureWheelGroup[] = [
    {
      label: "Capture",
      color: "",
      spokes: [
        { label: "Seamless capture", contemporaries: [], progress: 0.8 },
        { label: "Advanced audio capture", contemporaries: [], progress: 0.2 },
        { label: "Sketch capture", contemporaries: [], progress: 0.4 }
      ]
    },
    {
      label: "Novel",
      color: "#32a852",
      spokes: [
        { label: "Nodularity", contemporaries: [], progress: 0.7 },
        { label: "Voice interaction", contemporaries: [] },
        { label: "Some new", contemporaries: [] }
      ]
    },
    {
      label: "Markdown",
      // color: "#c9409a",
      spokes: [
        { label: "md 1", contemporaries: [], progress: 0.8 },
        { label: "md 2", contemporaries: [], progress: 1 },
        { label: "md 3", contemporaries: [], progress: 0.2 },
        { label: "md 4", contemporaries: [], progress: 0.3 },
        { label: "md 6", contemporaries: [], progress: 0.65 },
        { label: "md 7", contemporaries: [], progress: 0.8 },
        { label: "md 5", contemporaries: [], progress: 0.1 }
      ]
    }
  ];

  const emptyDividerSpoke: FeatureWheelSpoke = {
    label: "",
    contemporaries: [],
    isDivider: true
  };
  if (categoryColoringStyle === "bg") {
    spokesTwo = spokesTwo.map((group) => {
      group.spokes = [emptyDividerSpoke, ...group.spokes];
      return group;
    });
  }
  let groupCount = spokesTwo.length;
  let angle = (2 * Math.PI) / groupCount;
  let spokeAngle = angle / 3;
</script>

<svg class="wheel" viewBox="-300 -300 600 600">
  {#each spokesTwo as group, i (group.label)}
    {#if categoryColoringStyle === "bg"}
      <path
        d={`M 0 0 L ${radius * Math.cos(i * angle)} ${
          radius * Math.sin(i * angle)
        } A ${radius} ${radius} 0 0 1 ${radius * Math.cos((i + 1) * angle)} ${
          radius * Math.sin((i + 1) * angle)
        } Z`}
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
      x={(radius + 60) * Math.cos(i * angle + angle / 2)}
      y={(radius + 60) * Math.sin(i * angle + angle / 2)}
      text-anchor="middle"
      dominant-baseline="middle"
      class="text-b1 font-bold"
    >
      {group.label}
    </text>

    {#each group.spokes as spoke, j (spoke.label)}
      <line
        x1="0"
        y1="0"
        x2={radius * Math.cos((i + j / group.spokes.length) * angle)}
        y2={radius * Math.sin((i + j / group.spokes.length) * angle)}
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
            Math.cos((i + j / group.spokes.length) * angle)}
          y2={radius *
            (1 - (spoke.progress ?? 0)) *
            Math.sin((i + j / group.spokes.length) * angle)}
          class="stroke-bgs2"
          stroke-width="1.5"
        />
        <rect
          x={radius *
            (1 - (spoke.progress ?? 0)) *
            Math.cos((i + j / group.spokes.length) * angle) -
            2}
          y={radius *
            (1 - (spoke.progress ?? 0)) *
            Math.sin((i + j / group.spokes.length) * angle) -
            2}
          width="20"
          height="20"
          class="fill-bgs1"
        />
        <text
          x={radius *
            (1 - (spoke.progress ?? 0)) *
            Math.cos((i + j / group.spokes.length) * angle) +
            8}
          y={radius *
            (1 - (spoke.progress ?? 0)) *
            Math.sin((i + j / group.spokes.length) * angle) +
            8}
          text-anchor="middle"
          dominant-baseline="middle"
          class="text-b5 bg-bgs2"
        >
          {Math.round((spoke.progress ?? 0) * 100)}%
        </text>
      {/if}
      <text
        x={(radius + angle * 40) *
          Math.cos((i + j / group.spokes.length) * angle)}
        y={(radius + 20) * Math.sin((i + j / group.spokes.length) * angle)}
        text-anchor="middle"
        dominant-baseline="middle"
        class="text-b3"
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
    max-width: 1250px;
    max-height: 750px;
    margin: auto;
  }
</style>
