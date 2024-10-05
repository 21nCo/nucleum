<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import { Orientation } from "$lib/client/types/direction.enum";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import { MemotronAction } from "../memotronAction.enum";
  import { propertyEditorStore } from "./properties/property.store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { createEventDispatcher } from "svelte";
  import { type IActiveCollectionStore } from "./collection.store";
  const dispatch = createEventDispatcher();
  export let isCaptureShortcutEnabled: boolean = false;
  export let collection: IActiveCollectionStore | undefined = undefined;

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
      appStore.runAction(MemotronAction.EDIT_COLLECTION_PROPERTIES, {
        componentParams: {
          id: collection?.id
        }
      });
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
