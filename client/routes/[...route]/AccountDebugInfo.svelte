<script lang="ts">
  import { clientStorage } from "@21n/persistence/persistence.utils";
  import { ClientStorageKey } from "@21n/persistence/persistence.type";
  import { parse } from "@21n/shared-utils/json.utils";
  import { authClient } from "@21n/components/account/auth";
  import Button from "@21n/elements/button/Button.svelte";
  import { appStore } from "@21n/stores/app.store";
  import NewAccountDebugInfo from "@21n/components/settings/account/NewAccountDebugInfo.svelte";
  async function refresh() {
    const val = await clientStorage.get(ClientStorageKey.USER);
    return parse(val ?? "{}");
  }

  async function signOut() {
    (await authClient()).signOut();
    appStore.gotoPath("/account/login");
  }
</script>

{#await refresh()}
  Loading...
{:then user}
  <div class="flex flex-col gap-1 w-full h-full justify-center items-center">
    <NewAccountDebugInfo {user} />
    <Button on:click={signOut} label="Sign out" />
  </div>
{:catch error}
  <div class="flex flex-col gap-1 w-full h-full justify-center items-center">
    <p class="text-red-500">Error loading account data: {error.message}</p>
    <Button on:click={signOut} label="Sign out" />
  </div>
{/await}
