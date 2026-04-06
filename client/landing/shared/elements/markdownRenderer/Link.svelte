<script lang="ts">
  import type { Snippet } from "svelte";
  import { sanitizeUrl } from "@21n/landing/shared/utils/url-sanitizer";
  let {
    href = "",
    title,
    children,
  }: {
    href?: string;
    title?: string | undefined;
    children?: Snippet;
  } = $props();

  const sanitizedHref = $derived(sanitizeUrl(href));
</script>

{#if sanitizedHref}
  <a
    href={sanitizedHref}
    {title}
    class="text-aps1 hover:underline"
    target={href?.startsWith("http") ? "_blank" : "_self"}
    rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    onclick={(event) => event.stopPropagation()}
  >
    {@render children?.()}
  </a>
{:else}
  <span class="text-aps1">
    {@render children?.()}
  </span>
{/if}
