<script>
  let numSpokes = 10; // Default number of spokes
  let radius = 280; // Radius of the wheel

  // Array of texts for each spoke
  let texts = [
    "Clipping",
    "Advanced Markdown",
    "Seamless capture",
    "Nodularity",
    "Feature 5",
    "Feature 6",
    "Feature 7",
    "Feature 8",
    "Feature 9",
    "Feature 10"
  ];

  // Calculate the angle between each spoke
  let angle = (2 * Math.PI) / numSpokes;

  // Generate an array of numbers from 0 to numSpokes - 1
  let spokes = Array.from({ length: numSpokes }, (_, i) => i);
</script>

<svg class="wheel" viewBox="-300 -300 600 600">
  <circle cx="0" cy="0" r={radius} stroke="white" fill="none" />

  {#each spokes as _, i}
    <line
      x1="0"
      y1="0"
      x2={radius * Math.cos(i * angle)}
      y2={radius * Math.sin(i * angle)}
      stroke="white"
      fill="white"
    />

    <text
      x={(radius + 60) * Math.cos(i * angle)}
      y={(radius + 20) * Math.sin(i * angle)}
      text-anchor="middle"
      dominant-baseline="middle"
      fill="white"
    >
      {texts[i]}
    </text>
  {/each}
  <circle cx="0" cy="0" r="10" fill="green" />
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
