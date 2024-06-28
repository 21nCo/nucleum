<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  const product = localStorage.getItem("product");
</script>

<svelte:head>
  <title>{$appStore?.appData?.name ?? product ?? "Blank"}</title>
  <meta
    name="description"
    content={$appStore?.appData?.meta?.description ?? ""}
  />
  <meta name="keywords" content={$appStore?.appData?.meta?.keywords ?? ""} />
  <meta name="robots" content="index, follow" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, user-scalable=no"
  />

  <!-- App icons -->
  <link
    rel="apple-touch-icon"
    sizes="180x180"
    href="icons/apple-touch-icon.png"
  />
  <link
    rel="icon"
    type="image/png"
    sizes="32x32"
    href="icons/favicon-32x32.png"
  />
  <link
    rel="icon"
    type="image/png"
    sizes="16x16"
    href="icons/favicon-16x16.png"
  />
  <link rel="favicon" href="icons/favicon.ico" />

  <link rel="manifest" crossorigin="use-credentials" href="manifest.json" />
  <link rel="mask-icon" href="icons/favicon-32x32.png" color="#5bbad5" />
  <meta name="msapplication-TileColor" content="#da532c" />
  <meta name="theme-color" content="#ffffff" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={$appStore?.appData?.meta?.url ?? ""} />
  <meta property="og:title" content={$appStore?.appData?.name ?? ""} />
  <meta
    property="og:description"
    content={$appStore?.appData?.meta?.description ?? ""}
  />
  <meta property="og:image" content={$appStore?.appData?.meta?.image ?? ""} />

  <!-- Twitter -->
  <meta
    property="twitter:card"
    content={$appStore?.appData?.meta?.twitterCard ?? ""}
  />
  <meta property="twitter:url" content={$appStore?.appData?.meta?.url ?? ""} />
  <meta property="twitter:title" content={$appStore?.appData?.name ?? ""} />
  <meta
    property="twitter:description"
    content={$appStore?.appData?.meta?.description ?? ""}
  />
  <meta
    property="twitter:image"
    content={$appStore?.appData?.meta?.image ?? ""}
  />
</svelte:head>
