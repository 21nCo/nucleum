<script>
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { GatheryEvent } from "$lib/client/types/gathery/gatheryEvent.enum";
  import { spaceStore } from "../space.store";
  let spaceName = "";
</script>

<div class="flex flex-col gap-4">
  <TextInput
    label={{ label: "Space Name", orientation: Orientation.Vertical }}
    bind:value={spaceName}
  />
  <ModalFooter
    action={GatheryEvent.CREATE_SPACE}
    primaryAction={{
      label: "Create Space",
      callback: async () => {
        return spaceStore.createSpace(spaceName);
      }
    }}
  />
</div>
