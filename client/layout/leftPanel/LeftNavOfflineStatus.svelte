<script lang="ts">
  import account from "@21n/stores/account.store";
  import { appStore } from "@21n/stores/app.store";
  import context from "@21n/stores/context.store";
  import { UserDataMode } from "@21n/types/account.type";
  import { Action } from "@21n/types/action.enum";
  import { cn } from "@21n/utils/ui.utils";

  export let isInThinMode = false;
</script>

{#if $account.dataMode === UserDataMode.LOCAL || $context.isInOfflineMode}
  <button
    class={cn(
      "text-ass1 border border-dashed dark:border-ass2/50 border-ass2 hover:bg-ass2/10 rounded-md px-2 py-1 my-1",
      {
        "text-b4": isInThinMode,
        "text-b3": !isInThinMode
      }
    )}
    on:click={() => {
      if ($account.dataMode === UserDataMode.LOCAL) {
        appStore.runAction(Action.SETTINGS);
      } else {
        appStore.runAction(Action.SYNC_SETTINGS);
      }
    }}>{isInThinMode ? "Offline" : "Offline mode"}</button
  >
{/if}
