<script lang="ts">
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { tagStore } from "$lib/client/products/pointron/pointron.store";
  import { onMount } from "svelte";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { confirmationNotification } from "$lib/client/stores/notification.store";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  export let id: string;
  let label: string = "";
  let modalRef: any;
  async function onAdd() {
    if (!label || !id) return;
    return tagStore.updateTag({ label, id });
  }
  onMount(() => {
    label = $tagStore.tags.find((tag) => tag.id === id)?.label || "";
  });
</script>

<div class="flex flex-col h-full p-1 justify-between">
  <TextInput
    bind:value={label}
    placeholder={"Tag name"}
    on:keydown={(e) => {
      if (e.key === "Enter") {
        modalRef.close();
      }
    }}
  />
  <ModalFooter
    on:close={() => {
      modalEvent.hideSpecific(PointronEventEnum.EDIT_TAG);
    }}
    primaryAction={{
      label: "Update",
      callback: onAdd
    }}
    secondaryAction={{
      label: "Delete",
      variant: ButtonVariant.DANGER,
      callback: async () => {
        if (!id) return false;
        confirmationNotification.notify({
          title: "Delete tag",
          message: "Are you sure you want to delete this tag?",
          confirmAction: {
            label: "Delete",
            variant: ButtonVariant.DANGER,
            callback: () => tagStore.delete(id)
          }
        });
      }
    }}
  />
</div>
