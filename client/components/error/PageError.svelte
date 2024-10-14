<script lang="ts">
  import { page } from "$app/stores";
  import Button from "$lib/client/elements/button/Button.svelte";
  import PageNotFoundIllustration from "$lib/client/illustrations/PageNotFoundIllustration.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import {
    ButtonStyle,
    ButtonVariant,
    type IButtonParams
  } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { renderMdAsHtml } from "../markdown/markdown.utils";
  export let message: string | undefined = undefined;
  export let actions: IButtonParams[] = [];
  $: is404 = $page?.url.pathname === "/404" || $page?.url.pathname === "/404/";
  $: erroredPath = $page?.url?.searchParams?.get("path");
  $: errorParam = $page?.url?.searchParams?.get("error");
  const titles = ["Yikes", "Uh-oh", "Oops", "Oh no", "Whoops", "Dang", "Shoot"];
</script>

<main class="flex flex-col w-full justify-center items-center gap-4 p-4 grow">
  <h1 class="font-medium text-title text-bgs4">
    <!-- {#if is404}
      <PageNotFoundIllustration />
    {:else} -->
    {is404 ? "404" : titles[Math.floor(Math.random() * titles.length)] + "!"}
    <!-- {/if} -->
  </h1>
  {#if !message}
    <div class="text-b3 text-center text-ars1">
      {$page?.error?.message ?? errorParam ?? "Something went wrong."}
    </div>
  {/if}
  <span>
    {@html renderMdAsHtml(
      message ??
        (is404
          ? `Oops! The page **${erroredPath ?? " "}** you're looking for doesn't exist.`
          : "We would never want you to see this page. Please chat with us or try again.")
    )}
  </span>
  <div class="flex gap-2">
    {#if actions.length > 0}
      {#each actions as action}
        <Button
          {...action}
          type={action.variant}
          on:click={() => action.callback?.()}
        />
      {/each}
    {:else}
      <Button
        size={Size.sm}
        style={ButtonStyle.OUTLINED}
        label={is404 ? "Go back home" : "Try again"}
        on:click={() => {
          appStore.gotoPath("/");
        }}
      />
      {#if !is404}
        <Button
          size={Size.sm}
          type={ButtonVariant.PRIMARY}
          label="Chat with us"
          on:click={() => {
            appStore.runAction("chat");
          }}
        />
      {/if}
    {/if}
  </div>
</main>
