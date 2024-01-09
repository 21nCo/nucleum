<script lang="ts">
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { appStore } from "$lib/tidy/stores/app.store";
  import { initiateOAuth2Flow } from "$lib/tidy/utils/oauth.utils";
  import { isValidArray } from "$lib/tidy/utils/obj.utils";
  import { properCase } from "$lib/tidy/utils/text.utils";
</script>

<div class="flex flex-col w-full gap-4">
  {#if isValidArray($appStore?.appData?.oAuthConfig)}
    {#each $appStore.appData.oAuthConfig as provider}
      <Button
        width="w-full"
        icon={provider.oauth_slug}
        label={"Continue with " + properCase(provider.oauth_slug)}
        on:click={() => {
          initiateOAuth2Flow(provider.provider);
        }}
      />
    {/each}
  {/if}
</div>
