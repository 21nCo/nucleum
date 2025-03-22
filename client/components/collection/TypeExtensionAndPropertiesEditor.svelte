<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import { Orientation } from "$lib/client/types/direction.enum";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import { propertyEditorStore } from "./properties/property.store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { createEventDispatcher } from "svelte";
  import { type IActiveCollectionStore } from "./collection.store";
  import { resourceAction } from "../flux/resourceStores/resource.utils";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import { ResourceActionType } from "../flux/resourceStores/resource.type";
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
          ? "ph:pencil-simple-line-light"
          : "ph:plus-light"}
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
