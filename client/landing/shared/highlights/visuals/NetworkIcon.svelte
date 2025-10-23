<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";

  let className: string = "";
  export { className as class };
</script>

<div
  class={cn("w-full h-full flex items-center justify-center -mt-10", className)}
>
  <svg
    width="240"
    height="180"
    viewBox="0 0 240 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Device icons connected in network -->
    <!-- Laptop -->
    <rect
      x="90"
      y="45"
      width="60"
      height="40"
      rx="3"
      fill="#F0F4FF"
      stroke="#4B7BF5"
      stroke-width="2"
    />
    <path
      d="M85 90L155 90C156.657 90 158 91.343 158 93V95C158 95 158 95 158 95H82C82 95 82 95 82 95V93C82 91.343 83.343 90 85 90Z"
      fill="#F0F4FF"
      stroke="#4B7BF5"
      stroke-width="2"
    />

    <!-- Mobile device 1 -->
    <rect
      x="40"
      y="105"
      width="30"
      height="50"
      rx="4"
      fill="#F0F4FF"
      stroke="#4B7BF5"
      stroke-width="2"
    />
    <rect x="48" y="145" width="14" height="4" rx="1" fill="#4B7BF5" />
    <rect x="50" y="110" width="10" height="2" rx="1" fill="#4B7BF5" />

    <!-- Mobile device 2 -->
    <rect
      x="170"
      y="105"
      width="30"
      height="50"
      rx="4"
      fill="#F0F4FF"
      stroke="#4B7BF5"
      stroke-width="2"
    />
    <rect x="178" y="145" width="14" height="4" rx="1" fill="#4B7BF5" />
    <rect x="180" y="110" width="10" height="2" rx="1" fill="#4B7BF5" />

    <!-- Connection lines -->
    <line
      x1="120"
      y1="95"
      x2="55"
      y2="105"
      stroke="#4B7BF5"
      stroke-width="1.5"
      stroke-dasharray="3 2"
    />
    <line
      x1="120"
      y1="95"
      x2="185"
      y2="105"
      stroke="#4B7BF5"
      stroke-width="1.5"
      stroke-dasharray="3 2"
    />

    <!-- Offline label -->
    <circle
      cx="55"
      cy="85"
      r="15"
      fill="#F0F4FF"
      stroke="#4B7BF5"
      stroke-width="2"
    />
    <path
      d="M50 90L60 80M50 80L60 90"
      stroke="#4B7BF5"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
</div>
