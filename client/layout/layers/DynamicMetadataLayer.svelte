<script lang="ts">
  import type { IMetadata } from "../metadata.type";
  export let metadata: IMetadata = {
    title: "",
    description: "",
    keywords: "",
    url: "",
    image: "",
    twitterCard: ""
  };
</script>

<svelte:head>
  <title>{metadata?.title ?? "21n"}</title>
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
