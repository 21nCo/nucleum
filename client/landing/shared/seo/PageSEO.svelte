<script lang="ts">
  import type { ISEOMetadata } from "@21n/landing/shared/seo/seo.type";

  export let data: ISEOMetadata;
</script>

<svelte:head>
  <!-- Primary Meta Tags -->
  <title>{data.title}</title>
  <meta name="description" content={data.description} />
  <meta name="keywords" content={data.keywords.join(", ")} />
  <link rel="canonical" href={data.canonicalUrl} />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={data.canonicalUrl} />
  <meta property="og:title" content={data.title} />
  <meta property="og:description" content={data.description} />
  <meta property="og:image" content={data.ogImage} />
  <meta property="og:site_name" content="21n" />

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content={data.canonicalUrl} />
  <meta property="twitter:title" content={data.title} />
  <meta property="twitter:description" content={data.description} />
  <meta property="twitter:image" content={data.ogImage} />

  <!-- Additional SEO Meta Tags -->
  <meta name="robots" content="index, follow" />
  <meta name="googlebot" content="index, follow" />
  <meta name="language" content="English" />
  <meta name="author" content="21n" />

  <!-- Structured Data -->
  {#if data.structuredData && data.structuredData.length > 0}
    {#each data.structuredData as sData}
      {@html `<script type="application/ld+json">${JSON.stringify(sData)}</script>`}
    {/each}
  {/if}
</svelte:head>
