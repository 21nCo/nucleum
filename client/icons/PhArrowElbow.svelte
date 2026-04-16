<script lang="ts">
  import type { SVGAttributes } from "svelte/elements";

  let {
    variant = "down-left",
    _variant = "light",
    ...svgProps
  }: {
    variant?: "down-left" | "right-up";
    _variant?: "duotone" | "light" | "thin";
  } & SVGAttributes<SVGSVGElement> = $props();
</script>

{#if variant === "down-left"}
  {#if _variant === "thin"}
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" {...svgProps}>
      <path
        fill="black"
        d="M196 32v144a4 4 0 0 1-4 4H57.66l41.17 41.17a4 4 0 0 1-5.66 5.66l-48-48a4 4 0 0 1 0-5.66l48-48a4 4 0 1 1 5.66 5.66L57.66 172H188V32a4 4 0 0 1 8 0"
      />
    </svg>
  {:else if _variant === "light"}
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" {...svgProps}>
      <path
        class="fill-fgs1"
        d="M198 32v144a6 6 0 0 1-6 6H62.49l37.75 37.76a6 6 0 1 1-8.48 8.48l-48-48a6 6 0 0 1 0-8.48l48-48a6 6 0 1 1 8.48 8.48L62.49 170H186V32a6 6 0 0 1 12 0"
      />
    </svg>
  {:else if _variant === "duotone"}
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" {...svgProps}>
      <g class="fill-fgs1">
        <path d="M96 128v96l-48-48Z" opacity="0.2" />
        <path
          d="M192 24a8 8 0 0 0-8 8v136h-80v-40a8 8 0 0 0-13.66-5.66l-48 48a8 8 0 0 0 0 11.32l48 48A8 8 0 0 0 104 224v-40h88a8 8 0 0 0 8-8V32a8 8 0 0 0-8-8M88 204.69L59.31 176L88 147.31Z"
        />
      </g>
    </svg>
  {/if}
{:else if variant === "right-up"}
  {#if _variant === "thin"}
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" {...svgProps}>
      <path
        fill="black"
        d="M218.83 98.83a4 4 0 0 1-5.66 0L172 57.66V192a4 4 0 0 1-4 4H24a4 4 0 0 1 0-8h140V57.66l-41.17 41.17a4 4 0 0 1-5.66-5.66l48-48a4 4 0 0 1 5.66 0l48 48a4 4 0 0 1 0 5.66"
      />
    </svg>
  {:else if _variant === "light"}
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" {...svgProps}>
      <path
        class="fill-fgs1"
        d="M220.24 100.24a6 6 0 0 1-8.48 0L174 62.49V192a6 6 0 0 1-6 6H24a6 6 0 0 1 0-12h138V62.49l-37.76 37.75a6 6 0 0 1-8.48-8.48l48-48a6 6 0 0 1 8.48 0l48 48a6 6 0 0 1 0 8.48"
      />
    </svg>
  {/if}
{/if}
