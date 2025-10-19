<script lang="ts">
  import OAuthRedirect from "@21n/components/oauth/OAuthRedirect.svelte";
  import { appStore } from "@21n/stores/app.store";
  appStore.toggleMenuVisibility(true);
</script>

<OAuthRedirect />
