<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { toasts } from "../../stores/notification.store";
  import { AlertType, type Toast } from "../../types/notification.type";
  import { Size } from "../../types/size.enum";
  import Button from "../button/Button.svelte";
  export let notification: Toast;
  export let isShownAsModal = false;
  function clickHandler(event: MouseEvent) {
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
    class="flex gap-2 bg-bgs2 shadow-md text-fgs2 border-t border-bgs3 border-opacity-50 items-center w-96 h-20 pr-2 rounded-md"
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
          <div class="text-fgs2 font-bold">{notification.title}</div>
        {/if}
        <div class="text-b2">
          {notification.message}
        </div>
      </div>
    </div>
    <div class="flex gap-2">
      {#if notification.actionText}
        <Button
          on:click={notification.callback}
          size={Size.xs}
          parentBgIndex={2}
        >
          {notification.actionText}
        </Button>
      {/if}
      {#if !notification.isNonDismissable}
        <Button icon="cross" on:click={clickHandler} />
      {/if}
    </div>
  </button>
{/if}
