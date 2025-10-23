<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { ResourceActionType } from "@21n/components/flux/resourceStores/resource.type";
  import { resourceAction } from "@21n/components/flux/resourceStores/resource.utils";
  import ModalFooter from "@21n/components/modal/ModalFooter.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import { toasts } from "@21n/stores/notification.store";
  import { Orientation } from "@21n/types/direction.enum";
  import type { ISelectItem } from "@21n/types/select.type";
  import ModalContentPadded from "@21n/components/modal/ModalContentPadded.svelte";
  import { combinationStore } from "@21n/components/combination/combination.store";
  import { CombinationType } from "@21n/components/combination/combination.type";

  let label = "";
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
      value: CombinationType.WHITEBOARD,
      isDisabled: true,
      badge: "planned"
    },
    {
      label: "Mind map",
      icon: "tree-view",
      value: CombinationType.MINDMAP,
      isDisabled: true,
      badge: "planned"
    },
    {
      label: "Timeline",
      icon: "calendar-blank",
      value: CombinationType.TIMELINE,
      isDisabled: true,
      badge: "planned"
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
    if (label.length === 0) {
      error = "Name is required";
      return;
    }
    if (type !== CombinationType.SIDENAV) {
      toasts.error("Only side nav combinations are supported currently");
      return;
    }
    const result = await combinationStore.createSideNavCombination({
      label,
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
        bind:value={label}
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
