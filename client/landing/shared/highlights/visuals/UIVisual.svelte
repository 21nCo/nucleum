<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";

  let className: string = "";
  export { className as class };
</script>

<div class={cn("w-full h-full flex items-center justify-center", className)}>
  <svg
    width="240"
    height="180"
    viewBox="0 0 240 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- UI interface visualization -->
    <rect
      x="45"
      y="30"
      width="150"
      height="120"
      rx="8"
      fill="#F0F4FF"
      stroke="#4B7BF5"
      stroke-width="2"
    />

    <!-- Header -->
    <rect
      x="45"
      y="30"
      width="150"
      height="25"
      rx="8"
      fill="#4B7BF5"
      fill-opacity="0.1"
    />
    <circle cx="60" cy="42.5" r="5" fill="#F87171" />
    <circle cx="75" cy="42.5" r="5" fill="#FBBF24" />
    <circle cx="90" cy="42.5" r="5" fill="#34D399" />

    <!-- UI elements -->
    <rect
      x="60"
      y="70"
      width="120"
      height="10"
      rx="2"
      fill="#4B7BF5"
      fill-opacity="0.2"
    />
    <rect
      x="60"
      y="90"
      width="80"
      height="10"
      rx="2"
      fill="#4B7BF5"
      fill-opacity="0.2"
    />
    <rect
      x="60"
      y="110"
      width="100"
      height="10"
      rx="2"
      fill="#4B7BF5"
      fill-opacity="0.2"
    />

    <!-- Decorative dots representing intuitive interface -->
    <circle cx="190" cy="70" r="3" fill="#34D399" />
    <circle cx="180" cy="80" r="3" fill="#34D399" />
    <circle cx="190" cy="90" r="3" fill="#34D399" />
    <circle cx="180" cy="100" r="3" fill="#34D399" />
    <circle cx="190" cy="110" r="3" fill="#34D399" />

    <!-- Connecting lines -->
    <path
      d="M190 70C195 70 200 75 200 80"
      stroke="#34D399"
      stroke-width="1"
      stroke-dasharray="2 1"
    />
    <path
      d="M180 80C175 80 170 85 170 90"
      stroke="#34D399"
      stroke-width="1"
      stroke-dasharray="2 1"
    />
    <path
      d="M190 90C195 90 200 95 200 100"
      stroke="#34D399"
      stroke-width="1"
      stroke-dasharray="2 1"
    />
    <path
      d="M180 100C175 100 170 105 170 110"
      stroke="#34D399"
      stroke-width="1"
      stroke-dasharray="2 1"
    />
  </svg>
</div>
