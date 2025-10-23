<script lang="ts">
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import MarkdownRenderer from "@21n/landing/shared/elements/MarkdownRenderer.svelte";
  export let title: string = "";
  export let body: string = "";
  export let isExpanded: boolean = false;
  export let onToggle: () => void;
</script>

<button
  on:click={onToggle}
  class="w-full flex gap-3 py-4 focus:outline-none border-b border-brs3 last:border-b-0"
>
  <div class="">
    {#if isExpanded}
      <SvgIcon icon="minus" />
    {:else}
      <SvgIcon icon="plus" />
    {/if}
    <!-- <svg
      class={`w-6 h-6 text-fgs4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg> -->
  </div>
  <div class="flex flex-col gap-3 text-left">
    <span class="text-lbase">{title}</span>
    {#if isExpanded}
      <div
        transition:fly={{ y: -20, duration: 200, easing: cubicOut }}
        class="pb-4 text-fgs2"
      >
        <div class="text-lb2 text-fgs2 max-w-3xl">
          <MarkdownRenderer text={body} />
        </div>
      </div>
    {/if}
  </div>
</button>
