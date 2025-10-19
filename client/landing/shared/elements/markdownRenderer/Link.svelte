<script>
  import { sanitizeUrl } from "@21n/landing/shared/utils/url-sanitizer";
  export let href = "";
  export let title = undefined;

  $: sanitizedHref = sanitizeUrl(href);
</script>

{#if sanitizedHref}
  <a
    href={sanitizedHref}
    {title}
    class="text-aps1 hover:underline"
    target={href?.startsWith("http") ? "_blank" : "_self"}
    rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    on:click|stopPropagation
  >
    <slot />
  </a>
{:else}
  <span class="text-aps1">
    <slot />
  </span>
{/if}
