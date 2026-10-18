<script lang="ts">
  import { oauth } from "@nucleum/surfaces/account/oauth";

  import { clientStorage } from "@nucleum/persistence/client-storage";
  import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import type { OAuthProviderConfig } from "@nucleum/client/runtime/account/oauth.type";
  import SubAtomLogo from "@nucleum/composition/SubAtomLogo.svelte";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
  onMount(async () => {
    clientStorage.setForSession(ClientStorageKey.EMBED_OAUTH, true);
    await triggerOAuth();
  });

  async function triggerOAuth() {
    const providerParam = $page.url.searchParams.get(AppSearchParam.PROVIDER);
    const guest = $page.url.searchParams.get(AppSearchParam.GUEST);
    if (!providerParam || !guest) return;
    const provider = $appStore.appData?.oAuthConfig.find(
      (p: OAuthProviderConfig) => p.oauth_slug === providerParam
    );
    if (!provider) return;
    await oauth.initiateOAuth2Flow(provider.provider, guest);
  }
</script>

<div class="flex flex-col items-center justify-center h-full w-full">
  <SubAtomLogo />
</div>
