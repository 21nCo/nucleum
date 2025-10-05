<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { toasts } from "$lib/client/stores/notification.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import type { ISelectItem } from "$lib/client/types/select.type";
  import ModalContentPadded from "$lib/client/components/modal/ModalContentPadded.svelte";
  import { combinationStore } from "./combination.store";
  import { CombinationType } from "./combination.type";

  let name = "";
  let type: CombinationType = CombinationType.SIDENAV;
  let error: string | undefined = undefined;
  const typeOptions: ISelectItem[] = [
    {
      label: "Side nav",
      icon: "sidebar",
      value: CombinationType.SIDENAV
    },
    {
      label: "Canvas",
      icon: "canvas",
      value: CombinationType.WHITEBOARD
    },
    {
      label: "Mind map",
      icon: "tree-view",
      value: CombinationType.MINDMAP
    },
    {
      label: "Timeline",
      icon: "calendar-blank",
      value: CombinationType.TIMELINE
    },
    {
      label: "Wall",
      icon: "widget",
      value: CombinationType.WALL,
      isDisabled: true,
      badge: "planned"
    }
  ];

  async function onSave() {
    error = undefined;
    if (name.length === 0) {
      error = "Name is required";
      return;
    }
    const result = await combinationStore.create({
      name,
      type
    });
    if (result && result.length > 0) {
      toasts.success("Combination created");
    } else {
      toasts.error("Failed to create combination");
    }
  }
</script>

<div class="flex flex-col gap-6 justify-between w-full h-full">
  <ModalContentPadded>
    <div class="flex flex-col gap-6 w-full h-full">
      <TextInput
        label={{
          label: "Name of the combination",
          orientation: Orientation.Vertical
        }}
        placeholder="Some combination"
        bind:value={name}
      />
      <OptionSelector
        labelProps={{ label: "Type of combination" }}
        options={typeOptions}
        bind:selected={type}
      />
    </div>
  </ModalContentPadded>
  <ModalFooter
    action={resourceAction(Resource.combination, ResourceActionType.CREATE)}
    bind:error
    primaryAction={{
      label: "Save",
      callback: onSave
    }}
    secondaryAction={{ label: "Cancel" }}
  />
</div>
