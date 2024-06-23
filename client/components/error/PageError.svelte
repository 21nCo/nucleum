<script lang="ts">
  import { page } from "$app/stores";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  $: is404 = $page?.url.pathname === "/404" || $page?.url.pathname === "/404/";
  const titles = ["Yikes", "Uh-oh", "Oops", "Oh no", "Whoops", "Dang", "Shoot"];
</script>

<main class="flex flex-col w-full justify-center items-center gap-4 p-4 grow">
  <h1 class="font-medium text-title text-bgs4">
    {is404 ? "404" : titles[Math.floor(Math.random() * titles.length)] + "!"}
  </h1>
  <div class="text-b3 text-center text-ars1">
    {$page?.error?.message ?? "Something went wrong."}
  </div>
  <div class="text-fgs3 text-b2 text-center">
    {is404
      ? "Oops! The page you're looking for doesn't exist."
      : "We would never want you to see this page. Please chat with us or try again."}
  </div>
  <div class="flex gap-2">
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
  </div>
</main>
