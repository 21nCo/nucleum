<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";

  let className: string = "";
  export { className as class };
</script>

<div class={cn("w-full h-full flex items-center justify-center", className)}>
  <svg
    width="240"
    height="240"
    viewBox="0 0 240 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Collections graph visual as seen in the image -->
    <circle
      cx="120"
      cy="120"
      r="50"
      fill="#F0F4FF"
      stroke="#4B7BF5"
      stroke-width="2"
    />
    <circle
      cx="70"
      cy="90"
      r="25"
      fill="#F0F4FF"
      stroke="#4B7BF5"
      stroke-width="2"
    />
    <circle
      cx="170"
      cy="90"
      r="25"
      fill="#F0F4FF"
      stroke="#4B7BF5"
      stroke-width="2"
    />
    <circle
      cx="70"
      cy="170"
      r="25"
      fill="#F0F4FF"
      stroke="#4B7BF5"
      stroke-width="2"
    />
    <circle
      cx="170"
      cy="170"
      r="25"
      fill="#F0F4FF"
      stroke="#4B7BF5"
      stroke-width="2"
    />

    <!-- Connecting lines -->
    <line
      x1="85"
      y1="90"
      x2="105"
      y2="105"
      stroke="#4B7BF5"
      stroke-width="1.5"
    />
    <line
      x1="155"
      y1="90"
      x2="135"
      y2="105"
      stroke="#4B7BF5"
      stroke-width="1.5"
    />
    <line
      x1="85"
      y1="170"
      x2="105"
      y2="135"
      stroke="#4B7BF5"
      stroke-width="1.5"
    />
    <line
      x1="155"
      y1="170"
      x2="135"
      y2="135"
      stroke="#4B7BF5"
      stroke-width="1.5"
    />

    <!-- Labels -->
    <text x="120" y="125" text-anchor="middle" fill="#000" font-size="12"
      >Collections</text
    >
    <text x="70" y="90" text-anchor="middle" fill="#000" font-size="10"
      >Analytics</text
    >
    <text x="170" y="90" text-anchor="middle" fill="#000" font-size="10"
      >Focus</text
    >
    <text x="70" y="170" text-anchor="middle" fill="#000" font-size="10"
      >Tasks</text
    >
    <text x="170" y="170" text-anchor="middle" fill="#000" font-size="10"
      >Goals</text
    >
  </svg>
</div>
