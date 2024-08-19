<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { toasts } from "../../stores/notification.store";
  import { AlertType, type Toast } from "../../types/notification.type";
  import Icon from "../Icon.svelte";
  export let notification: Toast;
  export let isShownAsModal = false;
  function close(event: MouseEvent) {
    toasts.reset();
    event.stopPropagation();
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
    class={cn(
      "flex gap-2 bg-fgs1 text-bgs1 shadow-md text--fgs2 border- border-brs3 border--opacity-50 items-center w-96 pr-2 rounded-md",
      {
        "h-20": notification.message && notification.title,
        "h-12": !notification.message || !notification.title
      }
    )}
    on:click|stopPropagation
  >
    <div
      class={cn("h-full w-1 shrink-0", {
        "bg-ags1": notification.type === AlertType.SUCCESS,
        "bg-ars1": notification.type === AlertType.ERROR,
        "bg-ass1": notification.type === AlertType.WARNING
      })}
    />
    <div class="flex h-full items-center gap-4 min-w-0 flex-1">
      <div class="flex flex-col gap-2 items-start truncate">
        {#if notification.title}
          <div
            class={cn("text-bgs2", {
              "font-semibold": notification.message,
              "text-b2": !notification.message
            })}
          >
            {notification.title}
          </div>
        {/if}
        {#if notification.message}
          <div class="text-b3">
            {notification.message}
          </div>
        {/if}
      </div>
    </div>
    <div class="flex gap-2 items-center">
      {#if notification.actionText}
        <button
          on:click={notification.callback}
          class="bg-fgs2 rounded-full px-2 py-1 text-b3"
        >
          {notification.actionText}
        </button>
      {/if}
      {#if !notification.isNonDismissable}
        <div class="flex items-center justify-center hover:bg-fgs3 rounded-md">
          <Icon icon="cross" on:click={close} class="stroke-bgs1" />
        </div>
      {/if}
    </div>
  </button>
{/if}
