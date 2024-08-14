<script lang="ts">
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { tagStore } from "$lib/client/products/pointron/pointron.store";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import modalEvent from "$lib/client/components/modal/modal.store";
  let label: string = "";
  async function onAdd() {
    if (!label) return;
    await tagStore.create({ label });
  }
</script>

<div class="h-full flex flex-col justify-between p-1">
  <TextInput bind:value={label} placeholder={"Tag name"} />
  <ModalFooter
    action={PointronAction.ADD_TAG}
    on:close={() => {
      modalEvent.hideSpecific(PointronAction.ADD_TAG);
    }}
    primaryAction={{
      label: "Add",
      callback: onAdd
    }}
    secondaryAction={{
      label: "Discard"
    }}
  />
</div>
