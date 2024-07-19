<script lang="ts">
  import { MemotronAction } from "$lib/client/types/memotron/memotronAction.enum";
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import FloatingButton from "$lib/client/elements/button/FloatingButton.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { Size } from "$lib/client/types/size.enum";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import { confirmationNotification } from "$lib/client/stores/notification.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { liveQuery } from "dexie";
  import { appStore } from "$lib/client/stores/app.store";
  import { typeStore } from "../collection/properties/type.store";
  let allTypes = liveQuery(() =>
    $dataManager.cacheSource.dexie.type.filter(activeResourceFilter).toArray()
  );
  $: filteredTypes = $allTypes ?? [];
</script>

<div class="relative flex flex-col gap-4 w-full h-full">
  {#each filteredTypes as type (type.id)}
    <div
      class="w-full flex justify-between items-center p-4 border border-brs3 rounded-md"
    >
      <span class="flex gap-2 items-center">
        {#if type.avatar}
          <AvatarView avatar={type.avatar} size={Size.sm} />
        {/if}
        <span>
          {type.label}
        </span>
      </span>
      <span>
        <Button
          icon="trash"
          tooltip="delete"
          on:click={() => {
            confirmationNotification.notify({
              title: "Delete type",
              message:
                "Are you sure you want to delete the type: " + type.label,
              confirmAction: {
                label: "Delete",
                variant: ButtonVariant.DANGER,
                callback: async () => typeStore.trash(type.id)
              }
            });
          }}
        />
      </span>
    </div>
  {/each}
  <FloatingButton
    params={{
      label: "Create new type",
      callback: async () => {
        appStore.runAction(MemotronAction.CREATE_TYPE);
      }
    }}
  />
</div>
