<script lang="ts">
  import { IconVariant } from "@21n/types/icon.type";

  export let variant: IconVariant = IconVariant.Outline;
</script>

{#if variant === IconVariant.Outline}
  <!-- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" {...$$props}>
    <path
      class="fill-fgs1"
      d="M225.91 74.79L181.22 30.1a14 14 0 0 0-19.8 0L38.1 153.41a13.94 13.94 0 0 0-4.1 9.9V208a14 14 0 0 0 14 14h168a6 6 0 0 0 0-12H110.49L225.91 94.59a14 14 0 0 0 0-19.8M93.52 210H48a2 2 0 0 1-2-2v-44.69a2 2 0 0 1 .59-1.41L136 72.49L183.52 120Zm123.9-123.9L192 111.52L144.49 64l25.41-25.41a2 2 0 0 1 2.83 0l44.69 44.68a2 2 0 0 1 0 2.83"
    />
  </svg> -->
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" {...$$props}>
    <path
      class="fill-fgs1"
      d="M224.49 76.2L179.8 31.51a12 12 0 0 0-17 0L39.51 154.83a12 12 0 0 0-3.51 8.48V208a12 12 0 0 0 12 12h168a4 4 0 0 0 0-8H105.66L224.49 93.17a12 12 0 0 0 0-16.97M94.34 212H48a4 4 0 0 1-4-4v-44.69a4 4 0 0 1 1.17-2.82L136 69.66L186.35 120ZM218.83 87.51L192 114.34L141.66 64l26.83-26.83a4 4 0 0 1 5.66 0l44.68 44.69a4 4 0 0 1 0 5.65"
    />
  </svg>
{:else if variant === IconVariant.Solid}
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" {...$$props}>
    <path
      class="fill-aps1"
      d="m227.32 73.37l-44.69-44.68a16 16 0 0 0-22.63 0L36.69 152A15.86 15.86 0 0 0 32 163.31V208a16 16 0 0 0 16 16h168a8 8 0 0 0 0-16H115.32l112-112a16 16 0 0 0 0-22.63M192 108.69L147.32 64l24-24L216 84.69Z"
    />
  </svg>
{/if}
