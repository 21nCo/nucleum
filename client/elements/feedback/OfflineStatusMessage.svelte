<script lang="ts">
  import context from "$lib/client/stores/context.store";
  import account from "$lib/client/stores/account.store";
  import view from "$lib/client/stores/view.store";
  import { UserDataMode } from "$lib/client/types/account.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";

  export let isIconOnly: boolean = false;

  function onClick() {
    appStore.runAction(Action.OFFLINE_STATUS);
  }

  $: label =
    !$context.isEmbed && $account.dataMode === UserDataMode.LOCAL
      ? "Data warning"
      : "Offline";
</script>

{#if $context.isInOfflineMode || $account.dataMode === UserDataMode.LOCAL}
  {#if isIconOnly}
    <button
      type="button"
      class="flex items-center gap-1 p-1 rounded-md hover:bg-ass2/10"
      aria-label={label}
      title={label}
      on:click={onClick}
    >
      <Icon icon="offline" class="text-ass1" />
    </button>
  {:else}
    <button
      type="button"
      class="flex items-center gap-1 text-ass1 px-1.5 py-0.5 text-b3 border border-dashed dark:border-ass2/50 border-ass2 hover:bg-ass2/10 rounded-md"
      on:click={onClick}
    >
      <Icon icon="offline" class="text-ass1" size={Size.sm} />
      {label}
    </button>
  {/if}
{/if}
