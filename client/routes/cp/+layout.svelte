<script>
  import ControlPanelLayout from "$lib/client/components/settings/asPage/SettingsAsPageLayout.svelte";
  import AuthGuard from "$lib/client/layout/layers/AuthGuard.svelte";
</script>

<AuthGuard let:isLoggedIn>
  {#if isLoggedIn}
    <ControlPanelLayout><slot /></ControlPanelLayout>
  {/if}
</AuthGuard>
