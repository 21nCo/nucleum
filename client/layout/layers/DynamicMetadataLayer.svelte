<script lang="ts">
  import { ClientStorageKey } from "$lib/client/persistence/persistence.type";
  import { clientStorage } from "$lib/client/persistence/persistence.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { onMount } from "svelte";
  let product = "";
  onMount(async () => {
    product = (await clientStorage.get(ClientStorageKey.PRODUCT)) ?? "";
  });
</script>

<svelte:head>
  <title>{$appStore?.appData?.name ?? product ?? "Blank"}</title>
  <meta
    name="description"
    content={$appStore?.appData?.meta?.description ?? ""}
  />
  <meta name="keywords" content={$appStore?.appData?.meta?.keywords ?? ""} />

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
