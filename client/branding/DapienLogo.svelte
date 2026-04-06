<script lang="ts">
  let { width = 1080 }: { width?: number } = $props();
</script>

<svg
  {width}
  height={width}
  viewBox="0 0 1080 1080"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <rect {width} height={width} class="fill-bgs1" />
  <path
    d="M754 386.123C754 489.797 654.938 678.965 551.263 678.965C447.589 678.965 326 497.306 326 393.632C326 289.957 432.571 281 536.246 281C639.92 281 754 282.448 754 386.123Z"
    fill="url(#paint0_linear_102_2)"
    stroke="url(#paint1_linear_102_2)"
    stroke-width="16"
    stroke-linecap="round"
  />
  <path
    d="M332 647C332 647 417.387 858 550.243 858C683.099 858 757 647 757 647"
    stroke="url(#paint2_linear_102_2)"
    stroke-width="45.0526"
    stroke-linecap="round"
  />
  <defs>
    <linearGradient
      id="paint0_linear_102_2"
      x1="547.054"
      y1="-286.181"
      x2="547.054"
      y2="532.174"
      gradientUnits="userSpaceOnUse"
    >
      <stop stop-color="#3FD3A7" />
      <stop offset="1" stop-color="#48CBDD" />
    </linearGradient>
    <linearGradient
      id="paint1_linear_102_2"
      x1="547.054"
      y1="-286.181"
      x2="547.054"
      y2="532.174"
      gradientUnits="userSpaceOnUse"
    >
      <stop stop-color="#3FD3A7" />
      <stop offset="1" stop-color="#48CBDD" />
    </linearGradient>
    <linearGradient
      id="paint2_linear_102_2"
      x1="551.505"
      y1="346.282"
      x2="551.505"
      y2="780.172"
      gradientUnits="userSpaceOnUse"
    >
      <stop stop-color="#3FD3A7" />
      <stop offset="1" stop-color="#48CBDD" />
    </linearGradient>
  </defs>
</svg>
