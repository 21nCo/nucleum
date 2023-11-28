<script lang="ts">
  import { toasts } from "../stores/app.store";
  import { AlertType, type Toast } from "../types/notification.type";
  import Button from "./button/Button.svelte";
  export let notification: Toast;
  function clickHandler() {
    toasts.reset();
  }
</script>

<button
  class="flex justify-between bg-bgs2 text-fgs2 border-t border-bgs3 border-opacity-50 items-center w-96 h-20 pr-2 rounded-md"
  on:click|stopPropagation
>
  <div class="flex h-full items-center gap-4">
    <div
      class="h-full w-2 {notification.type === AlertType.SUCCESS
        ? 'bg-ag'
        : 'bg-ar'}"
    ></div>
    <div class="flex flex-col gap-2 items-start">
      {#if notification.title}
        <div class="text-fgs2 text-b3 font-bold">{notification.title}</div>
      {/if}
      {notification.message}
    </div>
  </div>
  <div class="flex gap-2">
    {#if notification.actionText}
      <Button on:click={notification.callback}>
        {notification.actionText}
      </Button>
    {/if}
    <Button icon="cross" on:click={clickHandler} />
  </div>
</button>
