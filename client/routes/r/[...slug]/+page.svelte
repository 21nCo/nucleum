<script lang="ts">
  import OAuthRedirect from "$lib/client/components/settings/account/OAuthRedirect.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  appStore.toggleMenuVisibility(true);
</script>

<OAuthRedirect />
