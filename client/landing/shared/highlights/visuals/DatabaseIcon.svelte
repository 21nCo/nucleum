<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";

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
    <!-- Database visual -->
    <path
      d="M80 50C80 41.716 98.954 35 122 35C145.046 35 164 41.716 164 50V130C164 138.284 145.046 145 122 145C98.954 145 80 138.284 80 130V50Z"
      fill="#E6F2FF"
      stroke="#4B7BF5"
      stroke-width="2"
    />
    <path
      d="M80 50C80 58.284 98.954 65 122 65C145.046 65 164 58.284 164 50"
      stroke="#4B7BF5"
      stroke-width="2"
    />
    <path
      d="M80 90C80 98.284 98.954 105 122 105C145.046 105 164 98.284 164 90"
      stroke="#4B7BF5"
      stroke-width="2"
    />

    <!-- Checkmark for "Plug your own database" -->
    <circle
      cx="70"
      cy="50"
      r="15"
      fill="#E6FFEF"
      stroke="#34D399"
      stroke-width="2"
    />
    <path
      d="M65 50L69 54L76 47"
      stroke="#34D399"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Text -->
    <text x="122" y="170" text-anchor="middle" font-size="14" fill="#4B5563"
      >Plug your own database</text
    >
  </svg>
</div>
