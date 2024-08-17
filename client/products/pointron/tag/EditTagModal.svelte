<script lang="ts">
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { tagStore } from "$lib/client/products/pointron/pointron.store";
  import { onMount } from "svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { confirmationNotification } from "$lib/client/stores/notification.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  export let id: string;
  let label: string = "";
  async function onUpdateClick() {
    if (!label || !id) return { error: "Please enter a valid tag name" };
    return tagStore.modify({ label, id });
  }
  onMount(() => {
    label = $tagStore.items.find((tag) => tag.id === id)?.label || "";
  });
</script>

<div class="flex flex-col h-full p-1 justify-between">
  <TextInput bind:value={label} placeholder={"Tag name"} />
  <ModalFooter
    action={PointronAction.EDIT_TAG}
    primaryAction={{
      label: "Update",
      callback: onUpdateClick
    }}
    secondaryAction={{
      label: "Delete",
      variant: ButtonVariant.DANGER,
      callback: async () => {
        if (!id) return;
        confirmationNotification.notify({
          title: "Delete tag",
          message: "Are you sure you want to delete this tag?",
          confirmAction: {
            label: "Delete",
            variant: ButtonVariant.DANGER,
            callback: async () => {
              tagStore.delete(id);
              modalEvent.hide(PointronAction.EDIT_TAG);
              return true;
            }
          }
        });
      }
    }}
  />
</div>
