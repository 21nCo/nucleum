<script>
  import SubAtomLogo from "$lib/tidy/branding/SubAtomLogo.svelte";

  let radius = 280;
  let spokes = [
    { text: "Clipping", category: "Capture", contemporary: [""] },
    { text: "Capture", category: "Capture", contemporary: [""] }
  ];
  let angle = (2 * Math.PI) / spokes.length;
</script>

<svg class="wheel" viewBox="-300 -300 600 600">
  <circle
    cx="0"
    cy="0"
    r={radius}
    class="fill-none stroke-fgs3"
    stroke-width="2"
  />

  {#each spokes as spoke, i}
    <line
      x1="0"
      y1="0"
      x2={radius * Math.cos(i * angle)}
      y2={radius * Math.sin(i * angle)}
      class="fill-fgs3 stroke-fgs3"
      stroke-width="1.5"
    />

    <text
      x={(radius + 60) * Math.cos(i * angle)}
      y={(radius + 20) * Math.sin(i * angle)}
      text-anchor="middle"
      dominant-baseline="middle"
      class="fill-fgs1 text-b2"
    >
      {spoke.text}
    </text>
  {/each}
  <!-- <circle cx="0" cy="0" r="40" fill="none">
    <SubAtomLogo />
  </circle> -->
  <foreignObject x="-35" y="-35" class="w-16 h-[3.5rem] bg-bgs1 rounded-full">
    <SubAtomLogo />
  </foreignObject>
</svg>

<style>
  .wheel {
    width: 100%;
    height: 100%;
    max-width: 850px;
    max-height: 650px;
    margin: auto;
  }
</style>
