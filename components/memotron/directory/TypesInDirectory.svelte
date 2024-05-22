<script lang="ts">
  import { MemotronEvent } from "$lib/local/types/event.enum";
  import AvatarView from "$lib/tidy/elements/avatarPicker/AvatarView.svelte";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import FloatingButton from "$lib/tidy/elements/button/FloatingButton.svelte";
  import { dataManager } from "$lib/tidy/stores/data.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { activeResourceFilter, runAction } from "$lib/tidy/utils/utils";
  import { types } from "../type/type.store";
  import { confirmationNotification } from "$lib/tidy/stores/notification.store";
  import { ButtonVariant } from "$lib/tidy/types/button.type";
  import { liveQuery } from "dexie";
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
                callback: async () => types.delete(type.id)
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
        runAction(MemotronEvent.CREATE_TYPE);
      }
    }}
  />
</div>
