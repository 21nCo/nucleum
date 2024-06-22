<script lang="ts">
  import OAuthRedirect from "$lib/client/components/oauth/OAuthRedirect.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  appStore.toggleMenuVisibility(true);
</script>

<OAuthRedirect />
