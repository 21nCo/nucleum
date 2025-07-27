<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import SettingsAsPageLayout from "./SettingsAsPageLayout.svelte";
  import ComponentResolver from "$lib/client/layout/paint/ComponentResolver.svelte";
  import { page } from "$app/stores";
  import view from "$lib/client/stores/view.store";
  import SettingsAsModal from "../SettingsAsModal.svelte";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import { onMount } from "svelte";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import { setEmbedBg } from "$lib/client/utils/embed.utils";
  $: route = $page.url.searchParams.get(AppSearchParam.SETTING);
  $: if (route && $context.embed == Embed.HANDSET) {
    setEmbedBg(1);
  } else if ($context.embed == Embed.HANDSET) {
    setEmbedBg(2);
  }
  onMount(async () => {
    if ($context.embed == Embed.HANDSET) {
      setEmbedBg(2);
    }
  });
</script>

{#if $view.isConstrainedWidth}
  <SettingsAsPageLayout>
    {#if route}
      <ComponentResolver path={route} />
    {:else}
      <EmptyStatusView
        subText="Please select an option from the left panel to get started"
      />
    {/if}
  </SettingsAsPageLayout>
{:else}
  <SettingsAsModal />
{/if}
