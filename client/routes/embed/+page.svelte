<script lang="ts">
  import { clientStorage } from "$lib/client/persistence/persistence.utils";
  import { ClientStorageKey } from "$lib/client/persistence/persistence.type";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { appStore } from "$lib/client/stores/app.store";
  import type { OAuthProviderConfig } from "$lib/client/types/oauth.type";
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  onMount(async () => {
    clientStorage.setForSession(ClientStorageKey.EMBED_OAUTH, true);
    await triggerOAuth();
  });

  async function triggerOAuth() {
    const providerParam = $page.url.searchParams.get("provider");
    const guest = $page.url.searchParams.get("guest");
    if (!providerParam || !guest) return;
    const provider = $appStore.appData?.oAuthConfig.find(
      (p: OAuthProviderConfig) => p.oauth_slug === providerParam
    );
    if (!provider) return;
    await appStore.initiateOAuth2Flow(provider.provider, guest);
  }
</script>

<div class="flex flex-col items-center justify-center h-full w-full">
  <SubAtomLogo />
</div>
