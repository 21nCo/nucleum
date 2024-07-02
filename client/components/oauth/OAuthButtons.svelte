<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import { properCase } from "$lib/client/utils/text.utils";
  let progress = "";
</script>

<svelte:head>
  <!-- <meta name="appleid-signin-client-id" content="[CLIENT_ID]" />
  <meta name="appleid-signin-scope" content="[SCOPES]" />
  <meta name="appleid-signin-redirect-uri" content="[REDIRECT_URI]" />
  <meta name="appleid-signin-state" content="[STATE]" />
  <meta name="appleid-signin-nonce" content="[NONCE]" />
  <meta name="appleid-signin-use-popup" content="true" /> -->
  <!-- <script
    type="text/javascript"
    src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
  ></script> -->
</svelte:head>

<div class="flex flex-col w-full gap-4">
  {#if isValidArrayWithData($appStore?.appData?.oAuthConfig)}
    {#each $appStore.appData.oAuthConfig as provider}
      <Button
        size={Size.lg}
        id={provider.oauth_slug === "apple"
          ? "appleid-disabled-signin"
          : provider.oauth_slug + "-signin"}
        width="w-full"
        icon={provider.oauth_slug}
        isLoading={progress === provider.oauth_slug}
        label={"Continue with " + properCase(provider.oauth_slug)}
        on:click={() => {
          // if (provider.oauth_slug === "apple") return;
          progress = provider.oauth_slug;
          appStore.initiateOAuth2Flow(provider.provider);
        }}
      />
    {/each}
  {/if}
</div>
