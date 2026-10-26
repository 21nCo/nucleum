<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import context from "@nucleum/client/runtime/context.store";
  import account from "@nucleum/client/runtime/account/account.store";

  import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";

  import { Action } from "@nucleum/client/config/action.enum";

  let {
    isIconOnly = false
  }: {
    isIconOnly?: boolean;
  } = $props();

  function onClick() {
    requireCommandHost().runAction(Action.OFFLINE_STATUS);
  }

  const label = $derived(
    !$context.isEmbed && $account.dataMode === UserDataMode.LOCAL
      ? "Data warning"
      : "Offline"
  );
</script>

{#if $context.isInOfflineMode || $account.dataMode === UserDataMode.LOCAL}
  {#if isIconOnly}
    <button
      type="button"
      class="flex items-center gap-1 p-1 rounded-md hover:bg-ass2/10"
      aria-label={label}
      title={label}
      onclick={onClick}
    >
      <Icon icon="offline" class="text-ass1" />
    </button>
  {:else}
    <button
      type="button"
      class="flex items-center gap-1 text-ass1 px-1.5 py-0.5 text-b3 border border-dashed dark:border-ass1/50 border-ass1 hover:bg-ass2/10 rounded-md"
      onclick={onClick}
    >
      <Icon icon="offline" class="text-ass1" size={Size.sm} />
      {label}
    </button>
  {/if}
{/if}
