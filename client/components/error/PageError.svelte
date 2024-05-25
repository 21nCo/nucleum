<script lang="ts">
  import { page } from "$app/stores";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  $: is404 = $page?.url.pathname === "/404" || $page?.url.pathname === "/404/";
</script>

<main class="flex flex-col w-full justify-center gap-4 items-center grow">
  <h1 class="font-medium text-title text-bgs4">
    {is404 ? "404" : $page.status}
  </h1>
  <div class="text-fgs3 text-b2">
    {$page?.error?.message ?? "Something went wrong. Please try again"}
  </div>
  <Button
    size={Size.sm}
    label="Try again"
    on:click={() => {
      appStore.gotoPath("/");
    }}
  />
</main>
