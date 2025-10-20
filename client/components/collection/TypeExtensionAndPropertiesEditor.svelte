<script lang="ts">
  import { appStore } from "@21n/stores/app.store";
  import { Size } from "@21n/types/size.enum";
  import { Orientation } from "@21n/types/direction.enum";
  import FormControlLabel from "@21n/elements/text/formLabel/FormControlLabel.svelte";
  import { propertyEditorStore } from "@21n/components/collection/properties/property.store";
  import Icon from "@21n/elements/Icon.svelte";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import { createEventDispatcher } from "svelte";
  import { type IActiveCollectionStore } from "@21n/components/collection/collection.store";
  import { resourceAction } from "@21n/components/flux/resourceStores/resource.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { ResourceActionType } from "@21n/components/flux/resourceStores/resource.type";
  const dispatch = createEventDispatcher();
  export let isCaptureShortcutEnabled: boolean = false;
  export let collection: IActiveCollectionStore | undefined = undefined;
  export let resource: Resource | undefined = undefined;
  const formLabelConfig = {
    orientation: Orientation.Vertical
  };

  function onCaptureShortcutChange(e: CustomEvent) {
    dispatch("shortcutChange", e.detail);
  }
</script>

<div class="flex flex-col items-start w-full gap-2">
  <FormControlLabel props={{ label: "Properties" }} />
  <button
    class="flex justify-center items-center w-full border border-brs3 rounded-md h-11 text-base"
    on:click={() => {
      appStore.runAction(
        resourceAction(Resource.property, ResourceActionType.EDIT),
        {
          componentParams: {
            id: collection?.id
          }
        }
      );
    }}
  >
    <span class="flex gap-2 text-fgs2 text-b2">
      <Icon
        icon={$propertyEditorStore.properties.length > 0
          ? "edit"
          : "plus"}
        size={Size.sm}
      />
      {$propertyEditorStore.properties.length > 0
        ? `Edit properties (${$propertyEditorStore.properties.length})`
        : "Add properties"}
    </span>
  </button>
</div>
{#if resource === Resource.node}
  <SwitchInput
    label={{
      ...formLabelConfig,
      label: "Add to capture shortcuts",
      orientation: Orientation.Horizontal,
      tooltip: {
        body: "Enabling this will create a shortcut on capture page to seamlessly capture a new node entry and add it to the collection.",
        actionText: "Learn more",
        action: "/kb/type-collections"
      }
    }}
    bind:checked={isCaptureShortcutEnabled}
    isExpanded={true}
    on:change={onCaptureShortcutChange}
  />
{/if}
