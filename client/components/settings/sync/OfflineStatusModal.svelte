<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import account from "$lib/client/stores/account.store";
  import { UserDataMode } from "$lib/client/types/account.type";
  import { Size } from "$lib/client/types/size.enum";
  import { Action } from "$lib/client/types/action.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import context from "$lib/client/stores/context.store";
  import { ButtonStyle } from "$lib/client/types/button.type";
</script>

<div class="flex flex-col justify-between gap-4 h-full w-full p-4">
  <div class="flex flex-col gap-4 w-full">
    <div class="flex flex-col gap-2 items-center">
      <Icon icon="offline" size={Size.xxl} />
      <h1 class="text-h4">You seem to be offline</h1>
    </div>
    <p class="text-fgs2 text-b2 text-center">
      {#if !$context.isEmbed && $account.dataMode === UserDataMode.LOCAL}
        You are currently using offline-mode on a browser. Kindly install and
        use Desktop/mobile app to avoid data loss.
      {:else if $account.dataMode !== UserDataMode.LOCAL}
        Changes made on this device while offline will be synced when you are
        back online.
      {:else}
        You are using offline-mode of the app. Changes will be lost if you
        delete the app.
      {/if}
    </p>
  </div>

  {#if !$context.isEmbed && $account.dataMode === UserDataMode.LOCAL}
    <ModalFooter
      orientation={Orientation.Vertical}
      action={Action.OFFLINE_STATUS}
      isHideSecondaryShortcut={true}
      primaryAction={{
        label: "See all downloads",
        icon: "weblink-two",
        callback: async () => {
          appStore.runAction("downloads");
          return true;
        }
      }}
      secondaryAction={{
        label: "Sign up as cloud user",
        icon: "proceed",
        callback: async () => {
          account.signOut({ isPreventDapIdClear: true });
          return true;
        }
      }}
    />
  {:else}
    <ModalFooter
      action={Action.OFFLINE_STATUS}
      primaryAction={{
        label: "I understand",
        style: ButtonStyle.OUTLINED
      }}
    />
  {/if}
</div>
