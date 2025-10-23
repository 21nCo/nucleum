<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { Size } from "@21n/types/size.enum";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { properCase } from "@21n/shared-utils/text.utils";
  export let currentProgress: string | undefined = undefined;
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
        isExpandToFullWidth={true}
        icon={provider.oauth_slug}
        isLoading={currentProgress === provider.oauth_slug}
        label={"Continue with " + properCase(provider.oauth_slug)}
        on:click={async () => {
          // if (provider.oauth_slug === "apple") return;
          currentProgress = provider.oauth_slug;
          await appStore.initiateOAuth2Flow(provider.provider);
        }}
      />
    {/each}
  {/if}
</div>
