<script lang="ts">
  import OAuthRedirect from "@nucleum/surfaces/account/oauth/OAuthRedirect.svelte";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  appStore.toggleMenuVisibility(true);
</script>

<OAuthRedirect />
