<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { Size } from "@21n/types/size.enum";
  import { properCase } from "@21n/shared-utils/text.utils";
  import { cn } from "@21n/utils/ui.utils";
  import Icon from "@21n/elements/Icon.svelte";
  import { authClient } from "./auth";
  import context from "@21n/stores/context.store";
  import {
    peformAccountApiCall,
    resolveAccountBaseUrl,
    resolveHost
  } from "../network";
  import { appStore } from "@21n/stores/app.store";
  import { ClientStorageKey } from "@21n/persistence/persistence.type";
  import { clientStorage } from "@21n/persistence/persistence.utils";

  export let providers: string[];
  export let isExpanded: boolean = false;
  export let currentProgress: string | undefined = undefined;
  export let region: string | undefined = undefined;
  const dev_isUseIntermediateApproach = true;
  const signIn = async (provider: string) => {
    await (
      await authClient({ region })
    ).signIn.social({
      provider,
      callbackURL: window.location.origin
    });
  };

  async function onClick(provider: string) {
    currentProgress = provider;
    console.log({ isEmbed: $context.isEmbed, provider });
    try {
      if ($context.isEmbed) {
        const region = await clientStorage.get(ClientStorageKey.REGION);
        const baseUrl = resolveAccountBaseUrl(region ?? "insouth");
        const host = resolveHost();
        const domain = host.split(".").slice(-2).join(".");
        const product = $appStore.product.toLowerCase();
        const link = `https://oauth.${domain}?provider=${provider}&callback=${product}&instance=${baseUrl}`;
        if (dev_isUseIntermediateApproach) {
          // if (provider === "apple") {
          //   window.location.href = link + "&localRedirect=true";
          // } else {
          appStore.openLink(link, true);
          // }
        } else {
          const response = await peformAccountApiCall(
            "api/auth/sign-in/social",
            {
              provider,
              // callbackURL: `${baseUrl}/mobile-oauth-bridge?callback=memotron`
              // callbackURL: `https://local.memotron.app/embed?callback=memotron`
              callbackURL: `${product}://oauthsignembed`
            }
          );
          if (response && response.ok) {
            const json = await response.json();
            if (json && json.url && json.redirect) {
              appStore.openLink(json.url, true);
            }
          } else {
            console.error("response is not ok");
          }
        }
      } else {
        await signIn(provider);
      }
    } catch (e) {
      console.error(e);
    }
  }
</script>

<div
  class={cn("flex w-full gap-4", {
    "flex-col": isExpanded,
    "justify-center": !isExpanded
  })}
>
  {#if providers && providers.length > 0}
    {#each providers as provider}
      {#if isExpanded}
        <Button
          id={provider === "apple"
            ? "appleid-disabled-signin"
            : provider + "-signin"}
          isExpandToFullWidth={isExpanded}
          icon={provider + "-oauth-logo"}
          isLoading={currentProgress === provider}
          label={isExpanded
            ? "Continue with " + properCase(provider)
            : undefined}
          on:click={() => onClick(provider)}
        />
      {:else}
        <button
          class="w-12 h-12 rounded-full flex items-center justify-center bg-bgs2 hover:bg-bgs2-striped"
          on:click={() => onClick(provider)}
        >
          <Icon
            icon={provider + "-oauth-logo"}
            size={Size.md}
            class="text-fgs1 fill-fgs1"
          />
        </button>
      {/if}
    {/each}
  {/if}
</div>
