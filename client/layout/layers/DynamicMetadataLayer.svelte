<svelte:options runes={true} />

<script lang="ts">
  import { browser } from "$app/environment";
  import type { IMetadata } from "@21n/layout/metadata.type";
  let { metadata = {
    title: "",
    description: "",
    keywords: "",
    url: "",
    image: "",
    twitterCard: ""
  } }: { metadata?: IMetadata } = $props();

  const pageTitle = $derived(metadata?.title ?? "21n");
  const windowTitle = $derived(
    import.meta.env.DEV && browser
      ? `${pageTitle} (${window.location.host})`
      : pageTitle
  );
</script>

<svelte:head>
  <title>{windowTitle}</title>
  <meta name="description" content={metadata?.description ?? ""} />
  <meta name="keywords" content={metadata?.keywords ?? ""} />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={metadata?.url ?? ""} />
  <meta property="og:title" content={metadata?.title ?? ""} />
  <meta property="og:description" content={metadata?.description ?? ""} />
  <meta property="og:image" content={metadata?.image ?? ""} />

  <!-- Twitter -->
  <meta property="twitter:card" content={metadata?.twitterCard ?? ""} />
  <meta property="twitter:url" content={metadata?.url ?? ""} />
  <meta property="twitter:title" content={metadata?.title ?? ""} />
  <meta property="twitter:description" content={metadata?.description ?? ""} />
  <meta property="twitter:image" content={metadata?.image ?? ""} />
</svelte:head>
