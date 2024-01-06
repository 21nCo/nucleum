<script lang="ts">
  import { toasts } from "../stores/app.store";
  import { AlertType, type Toast } from "../types/notification.type";
  import Button from "./button/Button.svelte";
  export let notification: Toast;
  export let isShownAsModal = false;
  function clickHandler() {
    toasts.reset();
  }
</script>

<!-- TODO - use snippets in Svlete 5 to reuse markup -->
{#if isShownAsModal}
  <div class="flex flex-col w-full gap-4 items-center">
    <div
      class="h-2 w-full rounded-full {notification.type === AlertType.SUCCESS
        ? 'bg-ags1'
        : 'bg-ars1'}"
    ></div>
    <div class="flex flex-col gap-2">
      {#if notification.title}
        <div class="text-fgs2 font-bold">{notification.title}</div>
      {/if}
      {notification.message}
    </div>
  </div>
{:else}
  <button
    class="flex justify-between bg-bgs3 text-fgs2 border-t border-bgs3 border-opacity-50 items-center w-96 h-20 pr-2 rounded-md"
    on:click|stopPropagation
  >
    <div class="flex h-full items-center gap-4">
      <div
        class="h-full w-1 {notification.type === AlertType.SUCCESS
          ? 'bg-ags1'
          : 'bg-ars1'}"
      ></div>
      <div class="flex flex-col gap-2 items-start">
        <div class="text-b2">
          {notification.message}
        </div>
        {#if notification.title}
          <div class="text-fgs2 font-bold">{notification.title}</div>
        {/if}
      </div>
    </div>
    <div class="flex gap-2">
      <!-- {#if notification.actionText}
        <Button on:click={notification.callback}>
          {notification.actionText}
        </Button>
      {/if} -->
      <Button icon="cross" on:click={clickHandler} />
    </div>
  </button>
{/if}
