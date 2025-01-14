<script lang="ts">
  import account from "$lib/client/stores/account.store";
  import { appStore } from "$lib/client/stores/app.store";
  import context from "$lib/client/stores/context.store";
  import { UserDataMode } from "$lib/client/types/account.type";
  import { Action } from "$lib/client/types/action.enum";
  import { cn } from "$lib/client/utils/ui.utils";

  export let isInThinMode = false;
</script>

{#if $account.dataMode === UserDataMode.LOCAL || $context.isInOfflineMode}
  <button
    class={cn("text-fgs3 bg-bgs3 rounded-md px-2 py-1 my-1", {
      "text-b4": isInThinMode,
      "text-b3": !isInThinMode
    })}
    on:click={() => {
      if ($account.dataMode === UserDataMode.LOCAL) {
        appStore.runAction(Action.SETTINGS);
      } else {
        appStore.runAction(Action.SYNC_SETTINGS);
      }
    }}>{isInThinMode ? "Offline" : "Offline mode"}</button
  >
{/if}
