<script lang="ts">
  import { LinkVariant } from "$lib/tidy/types/button.type";
  export let href: string | undefined = undefined;
  export let label: string;
  export let variant: LinkVariant = LinkVariant.DOTTED;
  // export let feedback: string = "arrow";
  export let isSameTab: boolean = false;
  let isHovering: boolean = false;
  if (!href?.includes("http")) isSameTab = true;
</script>

{#if href}
  <a
    class="relative hover:text-aps1 {variant === LinkVariant.DOTTED
      ? 'underline-dotted hover:underline-dotted-hover'
      : ''}"
    {href}
    target={isSameTab ? "_self" : "_blank"}
    on:mouseenter={() => (isHovering = true)}
    on:mouseleave={() => (isHovering = false)}
    >{label}
    <!-- {#if isHovering && feedback == "arrow"}
  <div class="absolute -right-5 top-1 text-aps1 -rotate-45 text-b2">→</div>
{/if} -->
  </a>
{:else}
  <button
    on:click
    class="hover:text-aps1 {variant === LinkVariant.DOTTED
      ? 'underline-dotted hover:underline-dotted-hover'
      : ''}"
  >
    {label}
  </button>
{/if}
